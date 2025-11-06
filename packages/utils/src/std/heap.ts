export const logMemoryUsage = () => {
  const used = process.memoryUsage();
  console.log(
    `Memory usage: RSS ${Math.round(used.rss / 1024 / 1024)} MB, Heap ${Math.round(used.heapUsed / 1024 / 1024)} MB`,
  );
};
