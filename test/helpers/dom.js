// 테스트 공용 도우미

/** 문서에 남은 dialog DOM 을 모두 지운다. */
function resetDom() {
  document.body.innerHTML = "";
}

/** 키보드 이벤트 발생 */
function key(target, keyName, init = {}) {
  const event = new KeyboardEvent("keydown", { key: keyName, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

/** 마우스 이벤트 발생 */
function mouse(target, type, init = {}) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, ...init });
  target.dispatchEvent(event);
  return event;
}

/**
 * addEventListener / removeEventListener 호출을 세어 남아 있는 리스너 수를 계산한다.
 * @param {EventTarget} target
 */
function trackListeners(target) {
  const active = new Map();
  const add = target.addEventListener;
  const remove = target.removeEventListener;
  target.addEventListener = function (type, fn, opt) {
    active.set(fn, (active.get(fn) || new Set()).add(type));
    return add.call(this, type, fn, opt);
  };
  target.removeEventListener = function (type, fn, opt) {
    const types = active.get(fn);
    if (types) {
      types.delete(type);
      if (types.size === 0) active.delete(fn);
    }
    return remove.call(this, type, fn, opt);
  };
  return {
    count() {
      let n = 0;
      active.forEach((types) => {
        n += types.size;
      });
      return n;
    },
    restore() {
      target.addEventListener = add;
      target.removeEventListener = remove;
    },
  };
}

module.exports = { resetDom, key, mouse, trackListeners };
