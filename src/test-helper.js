exports.streamToString = async function streamToString(readable) {
  let chunks = '';

  return new Promise((resolve, reject) => {
    readable.on('data', chunk => {
      chunks += chunk;
    });

    readable.on('error', reject);

    readable.on('end', () => {
      resolve(chunks);
    });
  });
};
