// probe5: .get() 调用形态
const store = new Map([[1, 'a']])
export async function fetchById(cfg, id) {
  return cfg.get(id)
}
