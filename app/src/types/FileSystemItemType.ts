export type DirectoryItemType = {
  name: string;
  path: string;
  isDirectory: true;
  isFile: false;
  hasChildren: boolean;
  active?: boolean;
};

export type FileItemSystemType = {
  name: string;
  path: string;
  isDirectory: false;
  isFile: true;
  active?: boolean;
};

export type FileSystemItemType = DirectoryItemType | FileItemSystemType;
