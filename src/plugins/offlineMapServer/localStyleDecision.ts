export type LocalStyleDecisionInput = {
  installed: boolean;
  /** Native start returned success after proving loopback bind. */
  started: boolean;
  /** Process-private token from native start — never read from /healthy. */
  ownershipToken: string;
};

/**
 * Fail-closed: LOCAL_MAPS_STYLE only when pack is installed, this process
 * started the loopback server, and native returned an ownership token.
 */
export const shouldUseLocalStyle = (
  opts: LocalStyleDecisionInput,
): boolean =>
  opts.installed && opts.started && opts.ownershipToken.length > 0;
