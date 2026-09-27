import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DatasetColumn } from "@/lib/types/dataset";
import type { SemanticSearchResponse } from "@/lib/types/ai";

const api = vi.hoisted(() => ({
  getDataset: vi.fn(),
  getDatasetColumns: vi.fn(),
  semanticSearch: vi.fn(),
}));

vi.mock("@/lib/api", () => api);

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "dataset-1" }),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/lib/context/auth-context", () => ({
  useAuth: () => ({ isAuthenticated: true, isLoading: false }),
}));

import SemanticSearchPage from "@/app/datasets/[id]/semantic-search/page";

const DATASET_ID = "dataset-1";

const dataset = {
  id: DATASET_ID,
  name: "Clientes",
  sourceFileName: "clientes.csv",
  rowCount: 120,
  phoneColumn: "Telefono",
  createdAtUtc: "2026-01-01T00:00:00Z",
};

const columns: DatasetColumn[] = [
  { id: "c1", name: "Nombre", dataType: 1 },
  { id: "c2", name: "Ciudad", dataType: 1 },
  { id: "c3", name: "Saldo", dataType: 2 },
  { id: "c4", name: "ClienteActivo", dataType: 4 },
];

function indexingProblem(status: unknown = "Pending") {
  return {
    type: "https://messageflow.app/problems/semantic-search-indexing",
    title: "Semantic search indexing",
    status,
    code: "semantic_search_indexing",
    detail: "El dataset se está indexando.",
    httpStatus: 409,
  };
}

function response(overrides: Partial<SemanticSearchResponse> = {}): SemanticSearchResponse {
  return {
    answer: "Encontré 1 fila parecida a lo que describes.",
    topK: 10,
    appliedFilters: [],
    matches: [
      {
        rowId: "row-1",
        rowNumber: 7,
        similarity: 0.95,
        values: { Nombre: "Ana Ruiz", Ciudad: "Bucaramanga", Saldo: "820000", ClienteActivo: "true" },
      },
    ],
    indexedRows: 118,
    totalRows: 120,
    ...overrides,
  };
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function renderPage() {
  render(<SemanticSearchPage />);
  await flush();
  await screen.findByLabelText("¿Qué estás buscando?");
}

function typeQuestion(text: string) {
  fireEvent.change(screen.getByLabelText("¿Qué estás buscando?"), { target: { value: text } });
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
}

describe("Búsqueda semántica", () => {
  beforeEach(() => {
    api.getDataset.mockReset().mockResolvedValue(dataset);
    api.getDatasetColumns.mockReset().mockResolvedValue(columns);
    api.semanticSearch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("carga la respuesta 200 y muestra las coincidencias con relevancia en porcentaje", async () => {
    api.semanticSearch.mockResolvedValue(response());
    await renderPage();

    typeQuestion("clientes quedale más en Bucaramanga");
    submit();
    await flush();

    expect(api.semanticSearch).toHaveBeenCalledWith({
      datasetId: DATASET_ID,
      question: "clientes quedale más en Bucaramanga",
      filters: undefined,
      topK: 10,
    });

    expect(await screen.findByText(/Encontré 1 fila parecida/)).toBeInTheDocument();
    expect(screen.getByText("relevancia 95%")).toBeInTheDocument();
    expect(screen.getByText("Fila 7 del archivo")).toBeInTheDocument();
    // Los valores se formatean según el dataType de la columna.
    expect(screen.getByText("Ana Ruiz")).toBeInTheDocument();
    expect(screen.getByText("820.000")).toBeInTheDocument();
    expect(screen.getByText("Sí")).toBeInTheDocument();
    expect(
      screen.getByText(/solo 118 tienen columnas de texto/),
    ).toBeInTheDocument();
  });

  it("trata matches vacío con 200 como 'sin coincidencias', no como fallo", async () => {
    api.semanticSearch.mockResolvedValue(
      response({
        answer: "No matching records were found for that question.",
        matches: [],
      }),
    );
    await renderPage();

    typeQuestion("ninguno de mis clientes habla inglés");
    submit();
    await flush();

    expect(await screen.findByText("Sin coincidencias")).toBeInTheDocument();
    expect(
      screen.getByText("No matching records were found for that question."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Algo falló de nuestro lado/)).not.toBeInTheDocument();
  });

  it("muestra el estado de indexado ante 409 y reintenta solo hasta tener resultados", async () => {
    await renderPage();
    vi.useFakeTimers();
    api.semanticSearch
      .mockRejectedValueOnce(indexingProblem("Indexing"))
      .mockResolvedValueOnce(response({ answer: "Listo: una fila coincide." }));

    typeQuestion("clientes de bucaramanga");
    submit();
    await flush();

    const notice = screen.getByText("Preparando este dataset para búsqueda semántica");
    expect(notice).toBeInTheDocument();
    // Es un estado informativo, no un error: se anuncia con aria-live y sin toast rojo.
    expect(notice.closest("[aria-live='polite']")).not.toBeNull();
    expect(screen.queryByText(/Algo falló de nuestro lado/)).not.toBeInTheDocument();
    expect(
      screen.getByText(/Reintento automático cada 25 s \(intento 1 de 20\)/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar ahora" })).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(25_000);
    });
    await flush();

    expect(api.semanticSearch).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Listo: una fila coincide.")).toBeInTheDocument();
    expect(screen.getByText("Búsqueda semántica lista.")).toBeInTheDocument();
    expect(
      screen.queryByText("Preparando este dataset para búsqueda semántica"),
    ).not.toBeInTheDocument();
  });

  it("respeta el máximo de reintentos y ofrece el reintento manual", async () => {
    await renderPage();
    vi.useFakeTimers();
    api.semanticSearch.mockRejectedValue({
      type: "https://messageflow.app/problems/semantic-search-indexing",
      title: "Conflict",
      status: 409,
      code: "semantic_search_indexing",
      detail: "Indexando.",
      httpStatus: 409,
    });

    typeQuestion("clientes de bucaramanga");
    submit();
    await flush();
    expect(api.semanticSearch).toHaveBeenCalledTimes(1);

    for (let i = 0; i < 19; i += 1) {
      await act(async () => {
        vi.advanceTimersByTime(25_000);
      });
      await flush();
    }

    expect(api.semanticSearch).toHaveBeenCalledTimes(20);
    expect(
      screen.getByText("Seguimos esperando al servidor. Puedes reintentar cuando quieras."),
    ).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(120_000);
    });
    expect(api.semanticSearch).toHaveBeenCalledTimes(20);
  });

  it("corta el reintento automático si el usuario edita la pregunta", async () => {
    await renderPage();
    vi.useFakeTimers();
    api.semanticSearch.mockRejectedValue(indexingProblem());

    typeQuestion("clientes de bucaramanga");
    submit();
    await flush();
    expect(api.semanticSearch).toHaveBeenCalledTimes(1);

    typeQuestion("clientes de cali");
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });

    expect(api.semanticSearch).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByText("Preparando este dataset para búsqueda semántica"),
    ).not.toBeInTheDocument();
  });

  it("responde 404 sin insinuar que el dataset existe", async () => {
    api.getDataset.mockRejectedValue({
      type: "about:blank",
      title: "Not Found",
      status: 404,
      detail: "Not Found",
      httpStatus: 404,
    });

    render(<SemanticSearchPage />);
    await flush();

    expect(screen.getByText("No encontramos este dataset.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver a mis datasets" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Buscar" })).not.toBeInTheDocument();
    expect(screen.queryByText(/otro usuario/)).not.toBeInTheDocument();
  });

  it("responde 404 de la búsqueda sin insinuar que el recurso existe", async () => {
    api.semanticSearch.mockRejectedValue({
      type: "about:blank",
      title: "Not Found",
      status: 404,
      detail: "Not Found",
      httpStatus: 404,
    });
    await renderPage();

    typeQuestion("clientes de bucaramanga");
    submit();
    await flush();

    expect(screen.getByText("No encontramos este dataset.")).toBeInTheDocument();
  });

  it("oculta la búsqueda semántica ante 503 y ofrece la consulta estructurada", async () => {
    api.semanticSearch.mockRejectedValue({
      type: "about:blank",
      title: "Service Unavailable",
      status: 503,
      detail: "Semantic search is disabled.",
      httpStatus: 503,
    });
    await renderPage();

    typeQuestion("clientes de bucaramanga");
    submit();
    await flush();

    expect(
      screen.getByText("La búsqueda semántica no está disponible."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "consulta estructurada" })).toHaveAttribute(
      "href",
      `/datasets/${DATASET_ID}/query`,
    );
    expect(screen.queryByRole("button", { name: "Buscar" })).not.toBeInTheDocument();
  });

  it("muestra los errores de validación junto al campo", async () => {
    api.semanticSearch.mockRejectedValue({
      type: "about:blank",
      title: "Bad Request",
      status: 400,
      code: "validation_failed",
      detail: "One or more validation errors occurred.",
      errors: { question: ["The question field is required."] },
      httpStatus: 400,
    });
    await renderPage();

    typeQuestion("x");
    submit();
    await flush();

    expect(screen.getByText("The question field is required.")).toBeInTheDocument();
    expect(screen.getByText("Revisa los campos marcados.")).toBeInTheDocument();
  });

  it("trata un 400 sin code como regla de negocio, no como error del formulario", async () => {
    api.semanticSearch.mockRejectedValue({
      type: "about:blank",
      title: "Bad Request",
      status: 400,
      detail: "La columna 'Saldo' no existe en este dataset.",
      httpStatus: 400,
    });
    await renderPage();

    typeQuestion("clientes con saldo alto");
    submit();
    await flush();

    expect(screen.getByText("No pudimos ejecutar esta búsqueda.")).toBeInTheDocument();
    expect(screen.getByText("La columna 'Saldo' no existe en este dataset.")).toBeInTheDocument();
    expect(screen.queryByText(/Algo falló de nuestro lado/)).not.toBeInTheDocument();
  });

  it("ofrece la consulta estructurada si el dataset no tiene columnas de texto", async () => {
    api.getDatasetColumns.mockResolvedValue([{ id: "c3", name: "Saldo", dataType: 2 }]);

    render(<SemanticSearchPage />);
    await flush();

    expect(
      screen.getByText(/no tiene columnas de texto, así que no admite búsqueda semántica/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "consulta estructurada" })).toHaveAttribute(
      "href",
      `/datasets/${DATASET_ID}/query`,
    );
    expect(screen.queryByRole("button", { name: "Buscar" })).not.toBeInTheDocument();
  });

  it("envía el filtro numérico y omite el value en is_null", async () => {
    api.semanticSearch.mockResolvedValue(
      response({
        appliedFilters: [{ column: "Saldo", operator: "equals", value: "500000" }],
      }),
    );
    await renderPage();

    typeQuestion("clientes con saldo alto");
    fireEvent.click(screen.getByRole("button", { name: "Agregar filtro" }));
    fireEvent.change(screen.getByLabelText("Columna del filtro 1"), {
      target: { value: "Saldo" },
    });
    fireEvent.change(screen.getByLabelText("Valor del filtro sobre Saldo"), {
      target: { value: "500000" },
    });
    submit();
    await flush();

    expect(api.semanticSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: [{ column: "Saldo", operator: "equals", value: "500000" }],
      }),
    );
    expect(await screen.findByText(/Saldo es igual a "500000"/)).toBeInTheDocument();

    // is_null no debe enviar value: el backend responde 400 si lo recibe.
    fireEvent.click(screen.getByRole("button", { name: "Agregar filtro" }));
    fireEvent.change(screen.getByLabelText("Columna del filtro 2"), {
      target: { value: "Ciudad" },
    });
    fireEvent.change(screen.getByLabelText("Operador del filtro 2"), {
      target: { value: "is_null" },
    });
    expect(screen.queryByLabelText("Valor del filtro sobre Ciudad")).not.toBeInTheDocument();
    submit();
    await flush();

    const lastCall = api.semanticSearch.mock.calls.at(-1)?.[0];
    expect(lastCall.filters).toHaveLength(2);
    expect(lastCall.filters[1]).toEqual({ column: "Ciudad", operator: "is_null" });
    expect(Object.hasOwn(lastCall.filters[1], "value")).toBe(false);
  });

  it("ofrece reintento ante un error de servidor", async () => {
    api.semanticSearch
      .mockRejectedValueOnce({
        type: "about:blank",
        title: "Internal Server Error",
        status: 500,
        detail: "",
        httpStatus: 500,
      })
      .mockResolvedValueOnce(response({ answer: "Ahora sí: una fila coincide." }));
    await renderPage();

    typeQuestion("clientes de bucaramanga");
    submit();
    await flush();

    expect(screen.getByText("Algo falló de nuestro lado.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await flush();

    expect(api.semanticSearch).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Ahora sí: una fila coincide.")).toBeInTheDocument();
  });
});
