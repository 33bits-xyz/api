export function extractData(
  data: number[][]
): {
  timestamp: number,
  root: string,
  text: string
} {
  const timestampBuffer = Buffer.from(data[0]);
  let timestamp = 0;
  for (let i = 0; i < timestampBuffer.length; i++) {
    timestamp = timestamp * 256 + timestampBuffer[i];
  }

  // Extract Merkle tree root
  const root = '0x' + Buffer.from(data[1]).toString('hex');

  // Extract message
  const messageArrays = data.slice(2);
  // @ts-ignore
  const messageBytes = [].concat(...messageArrays);
  const message = messageBytes.map(byte => String.fromCharCode(byte)).join('').replace(/\0/g, '');

  return { timestamp, root, text: message };
}
