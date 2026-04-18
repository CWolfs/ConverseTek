export type DeleteConfirmationContent = {
  title: string;
  body: string | string[];
};

export function buildDeleteConfirmationContent(opts: {
  isLink: boolean;
  inboundLinkCount: number;
}): DeleteConfirmationContent {
  const { isLink, inboundLinkCount } = opts;

  const title = `Are you sure you want to delete this ${isLink ? 'link' : 'node'}?`;

  if (isLink) {
    return { title, body: 'This action will delete the link and only this specific link.' };
  }

  if (inboundLinkCount > 0) {
    const c = inboundLinkCount;
    const nounSuffix = c === 1 ? '' : 's';
    const verbSuffix = c === 1 ? 's' : '';
    const linkRef = c === 1 ? 'that link' : 'those links';
    const pronoun = c === 1 ? 'it' : 'them';

    return {
      title,
      body: [
        "This action will delete the node and all it's children.",
        `${c} response node${nounSuffix} link${verbSuffix} to this prompt node. ` +
          `Deleting it will break ${linkRef} (set ${pronoun} to 'End of Dialogue').`,
        'Are you sure you want to do this?',
      ],
    };
  }

  return {
    title,
    body: "This action will delete the node and all it's children. Are you sure you want to do this?",
  };
}
