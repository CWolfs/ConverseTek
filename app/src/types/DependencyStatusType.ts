export type DependencyStatusType =
  | {
      status: 'success';
    }
  | {
      status: 'error';
      missingDependencies: string[];
    };
