// Copyright (c) 2016 Quildreen Motta. Licensed as MIT.

// This file implements the concept of contextual multimethods
// with very few optimisations: a lookup cache and a version
// cache. The lookup cache allows subsequent lookups to have
// only a hashtable lookup as dispatch overhead for recurring
// dispatches.

const uuid = require('uuid/v4');


// A multimethod performs dispatch on all arguments, using a Brand.
const multimethod = () => {
  let cache = Object.create(null);
  const methods = [];

  const resetCache = () => {
    cache = Object.create(null);
  }

  const hash = (args) => {
    return args.map(x  => x.identityHash).join('|');
  };

  const define = (dispatch, implementation) => {
    methods.push({ dispatch, implementation });
    resetCache();
    return invoke;
  }

  const matches = (identities) => ({ dispatch }) => {
    return (dispatch.length === identities.length)
    &&     (dispatch.every((x, i) => identities[i].some(y => x.is(y))));
  };

  const lookup = (args) => {
    const selected = methods.filter(matches(args.map(x => x.identities)));
    switch (selected.length) {
    case 0:
      throw new Error(`No method matched ${hash(args)}.
      
Given arguments:
  - ${args.join('\n -  ')}`);
    
    case 1:
      return selected[0].implementation;

    default:
      throw new Error(`Ambiguous method definitions for ${hash(args)}.

Given arguments:
 -  ${args.join('\n -  ')}
 
Methods matched:
 -  ${selected.map(x => x.dispatch).join('\n -  ')}`);
    }
  };

  const addAll = (multi, methods) => {
    methods.forEach(({ dispatch, implementation }) => multi.define(dispatch, implementation));
  };

  const clone = () => {
    const result = multimethod();
    addAll(result, methods);
    return result;
  };

  const concat = (method) => {
    const result = clone();
    addAll(result, method._methods);
    return result;
  };

  const invoke = (...args) => {
    const key = hash(args);
    let fn = cache[key];
    if (!fn) {
      fn = lookup(args);
      cache[key] = fn;
    }
    return fn(...args);
  };

  invoke.add = define;
  invoke.clone = clone;
  invoke.concat = concat;
  invoke._methods = methods;

  return invoke;
};


// A subject is a set of data together with a set of identities.
class Subject {
  constructor(identities = [], state = {}) {
    this.state = Object.assign(Object.create(null), state);
    this.updateIdentities(identities);
  }

  clone() {
    return new Subject(this.identities, this.state);
  }

  updateIdentities(identities) {
    this.identities = identities;
    this.identityHash = this.identities.map(x => x.identity).sort().join(':');
  }

  attach(identity) {
    this.updateIdentities(this.identities.filter(x => x !== identity).concat([identity]));
  }

  remove(identity) {
    this.updateIdentities(this.identities.filter(x => x !== identity));
  }

  has(identity) {
    return this.identities.some(x => x.is(identity));
  }
}

// A Brand is a provider of hierarchical identity, which can
// be attached to objects.
class Brand {
  constructor(description, parent = null) {
    this.parent = parent;
    this.description = description;
    this.identity = uuid();
  }

  is(identity) {
    return identity === this
    ||     Boolean(this.parent && this.parent.is(identity));
  }

  or(brand) {
    return new OrBrand(this, brand);
  }

  and(brand) {
    return new AndBrand(this, brand);
  }

  toString() {
    return `<Brand(${this.identity}): ${this.description} → ${this.parent}>`
  }
}


class OrBrand extends Brand {
  constructor(left, right) {
    super(`${left.description} | ${right.description}`);
    this.left = left;
    this.right = right;
  }

  rename(description) {
    this.description = description;
    return this;
  }

  is(identity) {
    return this.left.is(identity) || this.right.is(identity);
  }

  toString() {
    return `<OrBrand(${this.identity}): ${this.description} - ${this.left} | ${this.right}>`;
  }
}


class AndBrand extends Brand {
  constructor(left, right) {
    super(`${left.description} & ${right.description}`);
    this.left = left;
    this.right = right;
  }

  rename(description) {
    this.description = description;
    return this;
  }

  is(identity) {
    return this.left.is(identity) && this.right.is(identity);
  }

  toString() {
    return `<AndBrand(${this.identity}): ${this.description} - ${this.left} & ${this.right}>`;
  }
}


// A Context is a container of methods. Contexts may be combined
// with other contexts. Ambiguity is only checked at dispatch,
// and resolved by specificity.
class Context {
  constructor() {
    this.methods = Object.create(null);
  }

  define(name) {
    if (this.methods[name]) {
      throw new Error(`${name} already exists in this context`);
    }

    this.methods[name] = multimethod();
    return this.methods[name];
  }

  clone() {
    const result = new Context();
    Object.keys(this.methods).forEach(method => {
      result.methods[method] = this.methods[method].clone();
    });
    return result;
  }

  concat(context) {
    const result = this.clone();
    Object.keys(context.methods).forEach(name => {
      if (result.methods[name]) {
        result.methods[name].concat(context.methods[name]);
      } else {
        result.methods[name] = context.methods[name].clone();
      }
    });
  }
}


module.exports = {
  Subject,
  Brand, OrBrand, AndBrand,
  Context
};
