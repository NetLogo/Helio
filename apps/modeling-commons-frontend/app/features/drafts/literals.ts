export const draftLiterals = {
  modelUsecases: [
    { label: "Good for research", value: "research" },
    { label: "Good for teaching", value: "teaching" },
  ],
  permissionOptions: [
    { value: "private", label: "Private, only I can see this model" },
    { value: "unlisted", label: "Unlisted, anyone with the link can see this model" },
    { value: "public", label: "Public, anyone can see this model" },
  ],
  collaboratorOptions: [
    {
      value: "yes",
      label: "Yes, please add my model to the list of models looking for collaborators",
    },
  ],
  peerReviewKindOptions: [
    { value: "visualization", label: "I want suggestions to improve the visualization" },
    { value: "code", label: "I want suggestions to improve the code" },
    { value: "all", label: "I want suggestions to improve both the visualization and the code" },
  ],
} as const;
