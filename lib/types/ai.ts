export interface GenerateMessageRequest {
  description: string;
  tone: string;
  datasetId: string;
}

export interface GenerateMessageVariable {
  id: string;
  name: string;
  dataType: number;
}

export interface GenerateMessageResponse {
  messageTemplate: string;
  variables: GenerateMessageVariable[];
}
