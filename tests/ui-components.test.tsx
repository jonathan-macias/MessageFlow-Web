import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { Alert } from "@/components/ui/alert";
import { ExecutionStatusBadge, FlowStatusBadge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Tabs, TabPanel } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/ui/theme-toggle";

describe("Button", () => {
  it("renders its label and the primary (accent) style by default", () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveClass("bg-accent");
    expect(button).toHaveAttribute("type", "button");
  });

  it("is disabled and busy while loading, keeping its label", () => {
    render(<Button loading>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("exposes the same classes for link-styled buttons", () => {
    expect(buttonClass("danger", "sm")).toContain("text-bad-fg");
    expect(buttonClass("secondary")).toContain("border-line");
  });
});

describe("Field", () => {
  it("associates the label with the control", () => {
    render(
      <Field label="Email">
        <Input type="email" />
      </Field>,
    );
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("links the error to the control and marks it invalid", () => {
    render(
      <Field label="Name" error="Required">
        <Input />
      </Field>,
    );
    const input = screen.getByLabelText("Name");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Required");
  });
});

describe("Status badges", () => {
  it("maps flow statuses to their label and tone", () => {
    render(<FlowStatusBadge status={2} />);
    const badge = screen.getByText("Active");
    expect(badge).toHaveClass("text-ok-fg");
  });

  it("maps execution failures to the danger tone", () => {
    render(<ExecutionStatusBadge status={5} />);
    expect(screen.getByText("Failed")).toHaveClass("text-bad-fg");
  });

  it("falls back to a neutral Unknown badge for unexpected values", () => {
    render(<FlowStatusBadge status={99} />);
    expect(screen.getByText("Unknown")).toHaveClass("text-muted");
  });
});

describe("Alert", () => {
  it("announces errors immediately and other tones politely", () => {
    render(
      <>
        <Alert tone="error">Broken</Alert>
        <Alert tone="success">Saved</Alert>
      </>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Broken");
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
  });
});

describe("Tabs", () => {
  function Demo() {
    const [value, setValue] = useState("info");
    const tabs = [
      { id: "info", label: "Info" },
      { id: "message", label: "Message" },
      { id: "filter", label: "Filter" },
    ];
    return (
      <>
        <Tabs tabs={tabs} value={value} onChange={setValue} idPrefix="demo" label="Sections" />
        <TabPanel id={value} idPrefix="demo">
          {`${tabs.find((t) => t.id === value)?.label} content`}
        </TabPanel>
      </>
    );
  }

  it("exposes tablist semantics and selects with the keyboard", async () => {
    const user = userEvent.setup();
    render(<Demo />);

    expect(screen.getByRole("tablist", { name: "Sections" })).toBeInTheDocument();
    const first = screen.getByRole("tab", { name: "Info" });
    expect(first).toHaveAttribute("aria-selected", "true");

    first.focus();
    await user.keyboard("{ArrowRight}");

    const second = screen.getByRole("tab", { name: "Message" });
    expect(second).toHaveAttribute("aria-selected", "true");
    expect(second).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Message content");

    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Filter" })).toHaveAttribute("aria-selected", "true");
  });
});

describe("ThemeToggle", () => {
  afterEach(() => {
    document.documentElement.classList.remove("dark");
    localStorage.clear();
  });

  it("switches between dark and light and remembers the choice", async () => {
    const user = userEvent.setup();
    document.documentElement.classList.add("dark");
    render(<ThemeToggle />);

    await user.click(screen.getByRole("button", { name: "Switch to light theme" }));
    expect(document.documentElement).not.toHaveClass("dark");
    expect(localStorage.getItem("theme")).toBe("light");

    await user.click(screen.getByRole("button", { name: "Switch to dark theme" }));
    expect(document.documentElement).toHaveClass("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
  });
});
