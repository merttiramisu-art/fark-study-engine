/**
 * Read newline-delimited UTF-8 messages with bounded retained line bytes.
 * Rejected lines are drained through the next LF so later messages survive.
 * Upstream chunks and JSON-RPC responses are outside this reader's memory bound.
 */
export async function* readBoundedLines(input, maxBytes) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new RangeError('maxBytes must be positive');
  let fragments = [];
  let bytes = 0;
  let rejecting = false;
  async function* finishLine() {
    if (rejecting) {
      yield { oversized: true };
    } else {
      let data = Buffer.concat(fragments, bytes);
      // Preserve readline's CRLF behavior (strip one trailing CR).
      if (data.length && data[data.length - 1] === 13) data = data.subarray(0, -1);
      yield { line: data.toString('utf8') };
    }
    fragments = [];
    bytes = 0;
    rejecting = false;
  }
  for await (const chunk of input) {
    const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    let start = 0;
    while (start < data.length) {
      const lf = data.indexOf(10, start);
      const end = lf === -1 ? data.length : lf;
      const segment = data.subarray(start, end);
      if (!rejecting) {
        if (segment.length > maxBytes - bytes) {
          fragments = [];
          bytes = 0;
          rejecting = true;
        } else if (segment.length) {
          // Copy the bounded slice so a tiny fragment cannot retain an oversized backing chunk.
          fragments.push(Buffer.from(segment));
          bytes += segment.length;
        }
      }
      if (lf !== -1) {
        yield* finishLine();
        start = lf + 1;
      } else {
        break;
      }
    }
  }
  if (rejecting || bytes) yield* finishLine();
}
