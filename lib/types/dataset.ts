export interface DatasetListItem {
  id: string;
  name: string;
}

export interface DatasetDetail {
  id: string;
  name: string;
  sourceFileName: string;
  rowCount: number;
  phoneColumn: string;
  createdAtUtc: string;
}

export interface DatasetColumn {
  id: string;
  name: string;
  dataType: number;
}

export interface DatasetRow {
  id: string;
  rowNumber: number;
  values: Record<string, string | null>;
}

export interface PaginatedRows {
  items: DatasetRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UploadDatasetRequest {
  file: File;
  name: string;
  phoneColumn: string;
}

export interface UploadDatasetResponse {
  id: string;
}
