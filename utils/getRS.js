/*
 * getRS returns a "radioactive" object
 * whenever any of it's key or any of it's children's key is mutated, onChange is called
 * onChange is called with (chain, value, trap)
 * chain is basically full 'patch' where the mutation took place
 *
 * For Example:
 *
 * * state.a.b.c.d[2] = 100
 * * chain : ['a', 'b', 'c', 'd', '2']
 * * value : 100
 * * trap : 'set'
 */

// all RS should share the same disableOnChange
let disableOnChange = false

const getRS = (_state, onChange, chain = []) => {

  // if state is a function, call that function and use that as state
  const state = typeof _state === 'function' ? _state() : _state

  // return non-object types as is
  if (typeof state !== 'object' || state === null) return state

  // save reactive children to wrapper
  const radioactiveWrapper = Array.isArray(state) ? [] : {}

  Object.keys(state).forEach((key) => {
    radioactiveWrapper[key] = getRS(state[key], onChange, [...chain, key])
  })

  // this will be incremented by some amount when state is mutated
  // this is used in mutation flag API
  let $ = 0

  // then make the object itself radioactive
  return new Proxy(radioactiveWrapper, {

    set(target, prop, value) {
      if (disableOnChange) return Reflect.set(target, prop, value)
      return onChange([...chain, prop], value, 'set')
    },

    deleteProperty(target, prop) {
      if (disableOnChange) return Reflect.deleteProperty(target, prop)
      return onChange([...chain, prop], undefined, 'deleteProperty')
    },

    get(target, prop) {

      // isRadioactive API
      if (prop === '__isRadioactive__') return true

      // mutation flag API
      if (prop === '$') return $
      if (prop === '__INC$__') return () => { $++ }

      if (prop === '__disableOnChange__') return value => { disableOnChange = value }

      // reactive binding API
      if (prop[0] === '$') {
        const actualProp = prop.substr(1)
        if (target.hasOwnProperty(actualProp)) {

          let key = 'value'
          const propType = typeof target[actualProp]
          if (propType === 'boolean') key = 'checked'

          const binding =  {
            [key]: target[actualProp],
            onChange: e => {
              let value = e.target[key]
              if (propType === 'number') value = Number(value)
              onChange([...chain, actualProp], value, 'set')
            }
          }

          return binding
        }
      }

      return Reflect.get(target, prop)
    },

  })
}

export default getRS
