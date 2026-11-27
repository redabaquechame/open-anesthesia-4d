/** True once action `id` was done and `delay` seconds have passed since. */
export const after = (done: Map<string, number>, id: string, t: number, delay = 0) =>
  done.has(id) && t >= (done.get(id) as number) + delay;
