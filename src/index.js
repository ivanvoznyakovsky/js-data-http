/* global fetch:true Headers:true Request:true */
const axios = require('axios')
import {utils} from 'js-data'
import Adapter from 'js-data-adapter'

const {
  _,
  addHiddenPropsToTarget,
  copy,
  deepMixIn,
  extend,
  fillIn,
  forOwn,
  get,
  isArray,
  isFunction,
  isNumber,
  isObject,
  isSorN,
  isString,
  isUndefined,
  resolve,
  reject,
  toJson
} = utils

let hasFetch = false

try {
  hasFetch = window && window.fetch
} catch (e) {}

const noop = function (...args) {
  const self = this
  const opts = args[args.length - 1]
  self.dbg(opts.op, ...args)
  return resolve()
}

const noop2 = function (...args) {
  const self = this
  const opts = args[args.length - 2]
  self.dbg(opts.op, ...args)
  return resolve()
}

function isValidString (value) {
  return (value != null && value !== '')
}
function join (items, separator) {
  separator || (separator = '')
  return items.filter(isValidString).join(separator)
}
function makePath (...args) {
  let result = join(args, '/')
  return result.replace(/([^:\/]|^)\/{2,}/g, '$1/')
}

function encode (val) {
  return encodeURIComponent(val)
    .replace(/%40/gi, '@')
    .replace(/%3A/gi, ':')
    .replace(/%24/g, '$')
    .replace(/%2C/gi, ',')
    .replace(/%20/g, '+')
    .replace(/%5B/gi, '[')
    .replace(/%5D/gi, ']')
}

function buildUrl (url, params) {
  if (!params) {
    return url
  }

  const parts = []

  forOwn(params, function (val, key) {
    if (val === null || typeof val === 'undefined') {
      return
    }
    if (!isArray(val)) {
      val = [val]
    }

    val.forEach(function (v) {
      if (window.toString.call(v) === '[object Date]') {
        v = v.toISOString()
      } else if (isObject(v)) {
        v = toJson(v)
      }
      parts.push(`${encode(key)}=${encode(v)}`)
    })
  })

  if (parts.length > 0) {
    url += (url.indexOf('?') === -1 ? '?' : '&') + parts.join('&')
  }

  return url
}

const __super__ = Adapter.prototype

const DEFAULTS = {
  // Default and user-defined settings
  /**
   * @name HttpAdapter#basePath
   * @type {string}
   */
  basePath: '',

  /**
   * @name HttpAdapter#forceTrailingSlash
   * @type {boolean}
   * @default false
   */
  forceTrailingSlash: false,

  /**
   * @name HttpAdapter#http
   * @type {Function}
   */
  http: axios,

  /**
   * @name HttpAdapter#httpConfig
   * @type {Object}
   */
  httpConfig: {},

  /**
   * @name HttpAdapter#suffix
   * @type {string}
   */
  suffix: '',

  /**
   * @name HttpAdapter#useFetch
   * @type {boolean}
   * @default false
   */
  useFetch: false
}

/**
 * HttpAdapter class.
 *
 * @class HttpAdapter
 * @param {Object} [opts] Configuration options.
 * @param {string} [opts.basePath=''] TODO
 * @param {boolean} [opts.debug=false] TODO
 * @param {boolean} [opts.forceTrailingSlash=false] TODO
 * @param {Object} [opts.http=axios] TODO
 * @param {Object} [opts.httpConfig={}] TODO
 * @param {string} [opts.suffix=''] TODO
 * @param {boolean} [opts.useFetch=false] TODO
 */
function HttpAdapter (opts) {
  const self = this
  opts || (opts = {})
  fillIn(opts, DEFAULTS)
  Adapter.call(self, opts)
}

// Setup prototype inheritance from Adapter
HttpAdapter.prototype = Object.create(Adapter.prototype, {
  constructor: {
    value: HttpAdapter,
    enumerable: false,
    writable: true,
    configurable: true
  }
})

Object.defineProperty(HttpAdapter, '__super__', {
  configurable: true,
  value: Adapter
})

addHiddenPropsToTarget(HttpAdapter.prototype, {
  /**
   * @name HttpAdapter#afterDEL
   * @method
   * @param {string} url
   * @param {Object} config
   * @param {Object} opts
   * @param {Object} response
   */
  afterDEL: noop2,

  /**
   * @name HttpAdapter#afterGET
   * @method
   * @param {string} url
   * @param {Object} config
   * @param {Object} opts
   * @param {Object} response
   */
  afterGET: noop2,

  /**
   * @name HttpAdapter#afterHTTP
   * @method
   * @param {Object} config
   * @param {Object} opts
   * @param {Object} response
   */
  afterHTTP: noop2,

  /**
   * @name HttpAdapter#afterPOST
   * @method
   * @param {string} url
   * @param {Object} data
   * @param {Object} config
   * @param {Object} opts
   * @param {Object} response
   */
  afterPOST: noop2,

  /**
   * @name HttpAdapter#afterPUT
   * @method
   * @param {string} url
   * @param {Object} data
   * @param {Object} config
   * @param {Object} opts
   * @param {Object} response
   */
  afterPUT: noop2,

  /**
   * @name HttpAdapter#beforeDEL
   * @method
   * @param {Object} url
   * @param {Object} config
   * @param {Object} opts
   */
  beforeDEL: noop,

  /**
   * @name HttpAdapter#beforeGET
   * @method
   * @param {Object} url
   * @param {Object} config
   * @param {Object} opts
   */
  beforeGET: noop,

  /**
   * @name HttpAdapter#beforeHTTP
   * @method
   * @param {Object} config
   * @param {Object} opts
   */
  beforeHTTP: noop,

  /**
   * @name HttpAdapter#beforePOST
   * @method
   * @param {Object} url
   * @param {Object} data
   * @param {Object} config
   * @param {Object} opts
   */
  beforePOST: noop,

  /**
   * @name HttpAdapter#beforePUT
   * @method
   * @param {Object} url
   * @param {Object} data
   * @param {Object} config
   * @param {Object} opts
   */
  beforePUT: noop,

  _create (mapper, props, opts) {
    const self = this
    return self.POST(
      self.getPath('create', mapper, props, opts),
      self.serialize(mapper, props, opts),
      opts
    ).then(function (response) {
      return self._end(mapper, opts, response)
    })
  },

  _createMany (mapper, props, opts) {
    const self = this
    return self.POST(
      self.getPath('createMany', mapper, null, opts),
      self.serialize(mapper, props, opts),
      opts
    ).then(function (response) {
      return self._end(mapper, opts, response)
    })
  },

  _destroy (mapper, id, opts) {
    const self = this
    return self.DEL(
      self.getPath('destroy', mapper, id, opts),
      opts
    ).then(function (response) {
      return self._end(mapper, opts, response)
    })
  },

  _destroyAll (mapper, query, opts) {
    const self = this
    return self.DEL(
      self.getPath('destroyAll', mapper, null, opts),
      opts
    ).then(function (response) {
      return self._end(mapper, opts, response)
    })
  },

  _end (mapper, opts, response) {
    return [this.deserialize(mapper, response.data, opts), response]
  },

  _find (mapper, id, opts) {
    const self = this
    return self.GET(
      self.getPath('find', mapper, id, opts),
      opts
    ).then(function (response) {
      return self._end(mapper, opts, response)
    })
  },

  _findAll (mapper, query, opts) {
    const self = this
    return self.GET(
      self.getPath('findAll', mapper, opts.params, opts),
      opts
    ).then(function (response) {
      return self._end(mapper, opts, response)
    })
  },

  _update (mapper, id, props, opts) {
    const self = this
    return self.PUT(
      self.getPath('update', mapper, id, opts),
      self.serialize(mapper, props, opts),
      opts
    ).then(function (response) {
      return self._end(mapper, opts, response)
    })
  },

  _updateAll (mapper, props, query, opts) {
    const self = this
    return self.PUT(
      self.getPath('updateAll', mapper, null, opts),
      self.serialize(mapper, props, opts),
      opts
    ).then(function (response) {
      return self._end(mapper, opts, response)
    })
  },

  _updateMany (mapper, records, opts) {
    const self = this
    return self.PUT(
      self.getPath('updateMany', mapper, null, opts),
      self.serialize(mapper, records, opts),
      opts
    ).then(function (response) {
      return self._end(mapper, opts, response)
    })
  },

  /**
   * Create a new the record from the provided `props`.
   *
   * @name HttpAdapter#create
   * @method
   * @param {Object} mapper The mapper.
   * @param {Object} props Properties to send as the payload.
   * @param {Object} [opts] Configuration options.
   * @param {string} [opts.params] TODO
   * @param {string} [opts.suffix={@link HttpAdapter#suffix}] TODO
   * @return {Promise}
   */
  create (mapper, props, opts) {
    const self = this
    opts = opts ? copy(opts) : {}
    opts.params || (opts.params = {})
    opts.params = self.queryTransform(mapper, opts.params, opts)
    opts.suffix = self.getSuffix(mapper, opts)

    return __super__.create.call(self, mapper, props, opts)
  },

  /**
   * Create multiple new records in batch.
   *
   * @name HttpAdapter#createMany
   * @method
   * @param {Object} mapper The mapper.
   * @param {Array} props Array of property objects to send as the payload.
   * @param {Object} [opts] Configuration options.
   * @param {string} [opts.params] TODO
   * @param {string} [opts.suffix={@link HttpAdapter#suffix}] TODO
   * @return {Promise}
   */
  createMany (mapper, props, opts) {
    const self = this
    opts = opts ? copy(opts) : {}
    opts.params || (opts.params = {})
    opts.params = self.queryTransform(mapper, opts.params, opts)
    opts.suffix = self.getSuffix(mapper, opts)

    return __super__.createMany.call(self, mapper, props, opts)
  },

  /**
   * Make an Http request to `url` according to the configuration in `config`.
   *
   * @name HttpAdapter#DEL
   * @method
   * @param {string} url Url for the request.
   * @param {Object} [config] Http configuration that will be passed to
   * {@link HttpAdapter#HTTP}.
   * @param {Object} [opts] Configuration options.
   * @return {Promise}
   */
  DEL (url, config, opts) {
    const self = this
    let op
    config || (config = {})
    opts || (opts = {})
    config.url = url || config.url
    config.method = config.method || 'delete'

    // beforeDEL lifecycle hook
    op = opts.op = 'beforeDEL'
    return resolve(self[op](url, config, opts)).then(function (_config) {
      // Allow re-assignment from lifecycle hook
      config = isUndefined(_config) ? config : _config
      op = opts.op = 'DEL'
      self.dbg(op, url, config, opts)
      return self.HTTP(config, opts)
    }).then(function (response) {
      // afterDEL lifecycle hook
      op = opts.op = 'afterDEL'
      return resolve(self[op](url, config, opts, response)).then(function (_response) {
        // Allow re-assignment from lifecycle hook
        return isUndefined(_response) ? response : _response
      })
    })
  },

  /**
   * Transform the server response object into the payload that will be returned
   * to JSData.
   *
   * @name HttpAdapter#deserialize
   * @method
   * @param {Object} mapper The mapper used for the operation.
   * @param {Object} response Response object from {@link HttpAdapter#HTTP}.
   * @param {Object} opts Configuration options.
   * @return {(Object|Array)} Deserialized data.
   */
  deserialize (mapper, response, opts) {
    opts || (opts = {})
    if (isFunction(opts.deserialize)) {
      return opts.deserialize(mapper, response, opts)
    }
    if (isFunction(mapper.deserialize)) {
      return mapper.deserialize(mapper, response, opts)
    }
    if (response) {
      if (response.hasOwnProperty('data')) {
        return response.data
      }
    }
    return response
  },

  /**
   * Destroy the record with the given primary key.
   *
   * @name HttpAdapter#destroy
   * @method
   * @param {Object} mapper The mapper.
   * @param {(string|number)} id Primary key of the record to destroy.
   * @param {Object} [opts] Configuration options.
   * @param {string} [opts.params] TODO
   * @param {string} [opts.suffix={@link HttpAdapter#suffix}] TODO
   * @return {Promise}
   */
  destroy (mapper, id, opts) {
    const self = this
    opts = opts ? copy(opts) : {}
    opts.params || (opts.params = {})
    opts.params = self.queryTransform(mapper, opts.params, opts)
    opts.suffix = self.getSuffix(mapper, opts)

    return __super__.destroy.call(self, mapper, id, opts)
  },

  /**
   * Destroy the records that match the selection `query`.
   *
   * @name HttpAdapter#destroyAll
   * @method
   * @param {Object} mapper The mapper.
   * @param {Object} query Selection query.
   * @param {Object} [opts] Configuration options.
   * @param {string} [opts.params] TODO
   * @param {string} [opts.suffix={@link HttpAdapter#suffix}] TODO
   * @return {Promise}
   */
  destroyAll (mapper, query, opts) {
    const self = this
    query || (query = {})
    opts = opts ? copy(opts) : {}
    opts.params || (opts.params = {})
    deepMixIn(opts.params, query)
    opts.params = self.queryTransform(mapper, opts.params, opts)
    opts.suffix = self.getSuffix(mapper, opts)

    return __super__.destroyAll.call(self, mapper, query, opts)
  },

  /**
   * Log an error.
   *
   * @name HttpAdapter#error
   * @method
   * @param {...*} [args] Arguments to log.
   */
  error (...args) {
    if (console) {
      console[typeof console.error === 'function' ? 'error' : 'log'](...args)
    }
  },

  /**
   * Make an Http request using `window.fetch`.
   *
   * @name HttpAdapter#fetch
   * @method
   * @param {Object} config Request configuration.
   * @param {Object} config.data Payload for the request.
   * @param {string} config.method Http method for the request.
   * @param {Object} config.headers Headers for the request.
   * @param {Object} config.params Querystring for the request.
   * @param {string} config.url Url for the request.
   * @param {Object} [opts] Configuration options.
   */
  fetch (config, opts) {
    const requestConfig = {
      method: config.method,
      // turn the plain headers object into the Fetch Headers object
      headers: new Headers(config.headers)
    }

    if (config.data) {
      requestConfig.body = toJson(config.data)
    }

    return fetch(new Request(buildUrl(config.url, config.params), requestConfig)).then(function (response) {
      response.config = {
        method: config.method,
        url: config.url
      }
      return response.json().then(function (data) {
        response.data = data
        return response
      })
    })
  },

  /**
   * Retrieve the record with the given primary key.
   *
   * @name HttpAdapter#find
   * @method
   * @param {Object} mapper The mapper.
   * @param {(string|number)} id Primary key of the record to retrieve.
   * @param {Object} [opts] Configuration options.
   * @param {string} [opts.params] TODO
   * @param {string} [opts.suffix={@link HttpAdapter#suffix}] TODO
   * @return {Promise}
   */
  find (mapper, id, opts) {
    const self = this
    opts = opts ? copy(opts) : {}
    opts.params || (opts.params = {})
    opts.params = self.queryTransform(mapper, opts.params, opts)
    opts.suffix = self.getSuffix(mapper, opts)

    return __super__.find.call(self, mapper, id, opts)
  },

  /**
   * Retrieve the records that match the selection `query`.
   *
   * @name HttpAdapter#findAll
   * @method
   * @param {Object} mapper The mapper.
   * @param {Object} query Selection query.
   * @param {Object} [opts] Configuration options.
   * @param {string} [opts.params] TODO
   * @param {string} [opts.suffix={@link HttpAdapter#suffix}] TODO
   * @return {Promise}
   */
  findAll (mapper, query, opts) {
    const self = this
    query || (query = {})
    opts = opts ? copy(opts) : {}
    opts.params || (opts.params = {})
    opts.suffix = self.getSuffix(mapper, opts)
    deepMixIn(opts.params, query)
    opts.params = self.queryTransform(mapper, opts.params, opts)

    return __super__.findAll.call(self, mapper, query, opts)
  },

  /**
   * TODO
   *
   * @name HttpAdapter#GET
   * @method
   * @param {string} url The url for the request.
   * @param {Object} config Request configuration options.
   * @param {Object} [opts] Configuration options.
   * @return {Promise}
   */
  GET (url, config, opts) {
    const self = this
    let op
    config || (config = {})
    opts || (opts = {})
    config.url = url || config.url
    config.method = config.method || 'get'

    // beforeGET lifecycle hook
    op = opts.op = 'beforeGET'
    return resolve(self[op](url, config, opts)).then(function (_config) {
      // Allow re-assignment from lifecycle hook
      config = isUndefined(_config) ? config : _config
      op = opts.op = 'GET'
      self.dbg(op, url, config, opts)
      return self.HTTP(config, opts)
    }).then(function (response) {
      // afterGET lifecycle hook
      op = opts.op = 'afterGET'
      return resolve(self[op](url, config, opts, response)).then(function (_response) {
        // Allow re-assignment from lifecycle hook
        return isUndefined(_response) ? response : _response
      })
    })
  },

  /**
   * @name HttpAdapter#getEndpoint
   * @method
   * @param {Object} mapper TODO
   * @param {*} id TODO
   * @param {boolean} opts TODO
   * @return {string} Full path.
   */
  getEndpoint (mapper, id, opts) {
    const self = this
    opts || (opts = {})
    opts.params || (opts.params = {})
    const relationList = mapper.relationList || []
    let endpoint = isUndefined(opts.endpoint) ? (isUndefined(mapper.endpoint) ? mapper.name : mapper.endpoint) : opts.endpoint

    relationList.forEach(function (def) {
      if (def.type !== 'belongsTo' || !def.parent) {
        return
      }
      let item
      const parentKey = def.foreignKey
      const parentDef = def.getRelation()
      let parentId = opts.params[parentKey]

      if (parentId === false || !parentKey || !parentDef) {
        if (parentId === false) {
          delete opts.params[parentKey]
        }
        return false
      } else {
        delete opts.params[parentKey]

        if (isObject(id)) {
          item = id
        }

        if (item) {
          parentId = parentId || def.getForeignKey(item) || (def.getLocalField(item) ? get(def.getLocalField(item), parentDef.idAttribute) : null)
        }

        if (parentId) {
          delete opts.endpoint
          const _opts = {}
          forOwn(opts, function (value, key) {
            _opts[key] = value
          })
          _(_opts, parentDef)
          endpoint = makePath(self.getEndpoint(parentDef, parentId, _opts), parentId, endpoint)
          return false
        }
      }
    })

    return endpoint
  },

  /**
   * @name HttpAdapter#getPath
   * @method
   * @param {string} method TODO
   * @param {Object} mapper TODO
   * @param {(string|number)?} id TODO
   * @param {Object} opts Configuration options.
   */
  getPath (method, mapper, id, opts) {
    const self = this
    opts || (opts = {})
    const args = [
      isUndefined(opts.basePath) ? (isUndefined(mapper.basePath) ? self.basePath : mapper.basePath) : opts.basePath,
      self.getEndpoint(mapper, (isString(id) || isNumber(id) || method === 'create') ? id : null, opts)
    ]
    if (method === 'find' || method === 'update' || method === 'destroy') {
      args.push(id)
    }
    return makePath.apply(utils, args)
  },

  getSuffix (mapper, opts) {
    opts || (opts = {})
    if (isUndefined(opts.suffix)) {
      if (isUndefined(mapper.suffix)) {
        return this.suffix
      }
      return mapper.suffix
    }
    return opts.suffix
  },

  /**
   * Make an Http request.
   *
   * @name HttpAdapter#HTTP
   * @method
   * @param {Object} config Request configuration options.
   * @param {Object} [opts] Configuration options.
   * @return {Promise}
   */
  HTTP (config, opts) {
    const self = this
    const start = new Date()
    opts || (opts = {})
    config = copy(config)
    config = deepMixIn(config, self.httpConfig)
    if (self.forceTrailingSlash && config.url[config.url.length - 1] !== '/') {
      config.url += '/'
    }
    config.method = config.method.toUpperCase()
    const suffix = config.suffix || opts.suffix || self.suffix
    if (suffix && config.url.substr(config.url.length - suffix.length) !== suffix) {
      config.url += suffix
    }

    function logResponse (data) {
      const str = `${start.toUTCString()} - ${config.method.toUpperCase()} ${config.url} - ${data.status} ${(new Date().getTime() - start.getTime())}ms`
      if (data.status >= 200 && data.status < 300) {
        if (self.log) {
          self.dbg('debug', str, data)
        }
        return data
      } else {
        if (self.error) {
          self.error(`'FAILED: ${str}`, data)
        }
        return reject(data)
      }
    }

    if (!self.http) {
      throw new Error('You have not configured this adapter with an http library!')
    }

    return resolve(self.beforeHTTP(config, opts)).then(function (_config) {
      config = _config || config
      if (hasFetch && (self.useFetch || opts.useFetch || !self.http)) {
        return self.fetch(config, opts).then(logResponse, logResponse)
      }
      return self.http(config).then(logResponse, logResponse).catch(function (err) {
        return self.responseError(err, config, opts)
      })
    }).then(function (response) {
      return resolve(self.afterHTTP(config, opts, response)).then(function (_response) {
        return _response || response
      })
    })
  },

  /**
   * TODO
   *
   * @name HttpAdapter#POST
   * @method
   * @param {*} url TODO
   * @param {Object} data TODO
   * @param {Object} config TODO
   * @param {Object} [opts] Configuration options.
   * @return {Promise}
   */
  POST (url, data, config, opts) {
    const self = this
    let op
    config || (config = {})
    opts || (opts = {})
    config.url = url || config.url
    config.data = data || config.data
    config.method = config.method || 'post'

    // beforePOST lifecycle hook
    op = opts.op = 'beforePOST'
    return resolve(self[op](url, data, config, opts)).then(function (_config) {
      // Allow re-assignment from lifecycle hook
      config = isUndefined(_config) ? config : _config
      op = opts.op = 'POST'
      self.dbg(op, url, data, config, opts)
      return self.HTTP(config, opts)
    }).then(function (response) {
      // afterPOST lifecycle hook
      op = opts.op = 'afterPOST'
      return resolve(self[op](url, data, config, opts, response)).then(function (_response) {
        // Allow re-assignment from lifecycle hook
        return isUndefined(_response) ? response : _response
      })
    })
  },

  /**
   * TODO
   *
   * @name HttpAdapter#PUT
   * @method
   * @param {*} url TODO
   * @param {Object} data TODO
   * @param {Object} config TODO
   * @param {Object} [opts] Configuration options.
   * @return {Promise}
   */
  PUT (url, data, config, opts) {
    const self = this
    let op
    config || (config = {})
    opts || (opts = {})
    config.url = url || config.url
    config.data = data || config.data
    config.method = config.method || 'put'

    // beforePUT lifecycle hook
    op = opts.op = 'beforePUT'
    return resolve(self[op](url, data, config, opts)).then(function (_config) {
      // Allow re-assignment from lifecycle hook
      config = isUndefined(_config) ? config : _config
      op = opts.op = 'PUT'
      self.dbg(op, url, data, config, opts)
      return self.HTTP(config, opts)
    }).then(function (response) {
      // afterPUT lifecycle hook
      op = opts.op = 'afterPUT'
      return resolve(self[op](url, data, config, opts, response)).then(function (_response) {
        // Allow re-assignment from lifecycle hook
        return isUndefined(_response) ? response : _response
      })
    })
  },

  /**
   * TODO
   *
   * @name HttpAdapter#queryTransform
   * @method
   * @param {Object} mapper TODO
   * @param {*} params TODO
   * @param {*} opts TODO
   * @return {*} Transformed params.
   */
  queryTransform (mapper, params, opts) {
    opts || (opts = {})
    if (isFunction(opts.queryTransform)) {
      return opts.queryTransform(mapper, params, opts)
    }
    if (isFunction(mapper.queryTransform)) {
      return mapper.queryTransform(mapper, params, opts)
    }
    return params
  },

  /**
   * Error handler invoked when the promise returned by {@link HttpAdapter#http}
   * is rejected. Default implementation is to just return the error wrapped in
   * a rejected Promise, aka rethrow the error. {@link HttpAdapter#http} is
   * called by {@link HttpAdapter#HTTP}.
   *
   * @name HttpAdapter#responseError
   * @method
   * @param {*} err The error that {@link HttpAdapter#http} rejected with.
   * @param {Object} config The `config` argument that was passed to {@link HttpAdapter#HTTP}.
   * @param {*} opts The `opts` argument that was passed to {@link HttpAdapter#HTTP}.
   * @return {Promise}
   */
  responseError (err, config, opts) {
    return reject(err)
  },

  /**
   * TODO
   *
   * @name HttpAdapter#serialize
   * @method
   * @param {Object} mapper TODO
   * @param {Object} data TODO
   * @param {*} opts TODO
   * @return {*} Serialized data.
   */
  serialize (mapper, data, opts) {
    opts || (opts = {})
    if (isFunction(opts.serialize)) {
      return opts.serialize(mapper, data, opts)
    }
    if (isFunction(mapper.serialize)) {
      return mapper.serialize(mapper, data, opts)
    }
    return data
  },

  /**
   * TODO
   *
   * @name HttpAdapter#update
   * @method
   * @param {Object} mapper TODO
   * @param {*} id TODO
   * @param {*} props TODO
   * @param {Object} [opts] Configuration options.
   * @return {Promise}
   */
  update (mapper, id, props, opts) {
    const self = this
    opts = opts ? copy(opts) : {}
    opts.params || (opts.params = {})
    opts.params = self.queryTransform(mapper, opts.params, opts)
    opts.suffix = self.getSuffix(mapper, opts)

    return __super__.update.call(self, mapper, id, props, opts)
  },

  /**
   * TODO
   *
   * @name HttpAdapter#updateAll
   * @method
   * @param {Object} mapper TODO
   * @param {Object} props TODO
   * @param {Object} query TODO
   * @param {Object} [opts] Configuration options.
   * @return {Promise}
   */
  updateAll (mapper, props, query, opts) {
    const self = this
    query || (query = {})
    opts = opts ? copy(opts) : {}
    opts.params || (opts.params = {})
    deepMixIn(opts.params, query)
    opts.params = self.queryTransform(mapper, opts.params, opts)
    opts.suffix = self.getSuffix(mapper, opts)

    return __super__.updateAll.call(self, mapper, props, query, opts)
  },

  /**
   * Update multiple records in batch.
   *
   * {@link HttpAdapter#beforeUpdateMany} will be called before calling
   * {@link HttpAdapter#PUT}.
   * {@link HttpAdapter#afterUpdateMany} will be called after calling
   * {@link HttpAdapter#PUT}.
   *
   * @name HttpAdapter#updateMany
   * @method
   * @param {Object} mapper The mapper.
   * @param {Array} records Array of property objects to send as the payload.
   * @param {Object} [opts] Configuration options.
   * @param {string} [opts.params] TODO
   * @param {string} [opts.suffix={@link HttpAdapter#suffix}] TODO
   * @return {Promise}
   */
  updateMany (mapper, records, opts) {
    const self = this
    opts = opts ? copy(opts) : {}
    opts.params || (opts.params = {})
    opts.params = self.queryTransform(mapper, opts.params, opts)
    opts.suffix = self.getSuffix(mapper, opts)

    return __super__.updateMany.call(self, mapper, records, opts)
  }
})

/**
 * Add an Http actions to a mapper.
 *
 * @name HttpAdapter.addAction
 * @method
 * @param {string} name Name of the new action.
 * @param {Object} [opts] Action configuration
 * @param {string} [opts.adapter]
 * @param {string} [opts.pathname]
 * @param {Function} [opts.request]
 * @param {Function} [opts.response]
 * @param {Function} [opts.responseError]
 * @return {Function} Decoration function, which should be passed the mapper to
 * decorate when invoked.
 */
HttpAdapter.addAction = function (name, opts) {
  if (!name || !isString(name)) {
    throw new TypeError('action(name[, opts]): Expected: string, Found: ' + typeof name)
  }
  return function (mapper) {
    if (mapper[name]) {
      throw new Error('action(name[, opts]): ' + name + ' already exists on target!')
    }
    opts.request = opts.request || function (config) { return config }
    opts.response = opts.response || function (response) { return response }
    opts.responseError = opts.responseError || function (err) { return reject(err) }
    mapper[name] = function (id, _opts) {
      const self = this
      if (isObject(id)) {
        _opts = id
      }
      _opts = _opts || {}
      let adapter = self.getAdapter(opts.adapter || self.defaultAdapter || 'http')
      let config = {}
      fillIn(config, opts)
      if (!_opts.hasOwnProperty('endpoint') && config.endpoint) {
        _opts.endpoint = config.endpoint
      }
      if (typeof _opts.getEndpoint === 'function') {
        config.url = _opts.getEndpoint(self, _opts)
      } else {
        let args = [
          _opts.basePath || self.basePath || adapter.basePath,
          adapter.getEndpoint(self, isSorN(id) ? id : null, _opts)
        ]
        if (isSorN(id)) {
          args.push(id)
        }
        args.push(opts.pathname || name)
        config.url = makePath.apply(null, args)
      }
      config.method = config.method || 'GET'
      config.mapper = self.name
      deepMixIn(config)(_opts)
      return resolve(config)
        .then(_opts.request || opts.request)
        .then(function (config) { return adapter.HTTP(config) })
        .then(function (data) {
          if (data && data.config) {
            data.config.mapper = self.name
          }
          return data
        })
        .then(_opts.response || opts.response, _opts.responseError || opts.responseError)
    }
    return mapper
  }
}

/**
 * Add multiple Http actions to a mapper. See {@link HttpAdapter.addAction} for
 * action configuration options.
 *
 * @name HttpAdapter.addActions
 * @method
 * @param {Object.<string, Object>} opts Object where the key is an action name
 * and the value is the configuration for the action.
 * @return {Function} Decoration function, which should be passed the mapper to
 * decorate when invoked.
 */
HttpAdapter.addActions = function (opts) {
  opts || (opts = {})
  return function (mapper) {
    forOwn(mapper, function (value, key) {
      HttpAdapter.addAction(key, value)(mapper)
    })
    return mapper
  }
}

/**
 * Alternative to ES6 class syntax for extending `HttpAdapter`.
 *
 * __ES6__:
 * ```javascript
 * class MyHttpAdapter extends HttpAdapter {
 *   deserialize (Model, data, opts) {
 *     const data = super.deserialize(Model, data, opts)
 *     data.foo = 'bar'
 *     return data
 *   }
 * }
 * ```
 *
 * __ES5__:
 * ```javascript
 * var instanceProps = {
 *   // override deserialize
 *   deserialize: function (Model, data, opts) {
 *     var Ctor = this.constructor
 *     var superDeserialize = (Ctor.__super__ || Object.getPrototypeOf(Ctor)).deserialize
 *     // call the super deserialize
 *     var data = superDeserialize(Model, data, opts)
 *     data.foo = 'bar'
 *     return data
 *   },
 *   say: function () { return 'hi' }
 * }
 * var classProps = {
 *   yell: function () { return 'HI' }
 * }
 *
 * var MyHttpAdapter = HttpAdapter.extend(instanceProps, classProps)
 * var adapter = new MyHttpAdapter()
 * adapter.say() // "hi"
 * MyHttpAdapter.yell() // "HI"
 * ```
 *
 * @name HttpAdapter.extend
 * @method
 * @param {Object} [instanceProps] Properties that will be added to the
 * prototype of the subclass.
 * @param {Object} [classProps] Properties that will be added as static
 * properties to the subclass itself.
 * @return {Object} Subclass of `HttpAdapter`.
 */
HttpAdapter.extend = extend

/**
 * Details of the current version of the `js-data-http` module.
 *
 * @name HttpAdapter.version
 * @type {Object}
 * @property {string} version.full The full semver value.
 * @property {number} version.major The major version number.
 * @property {number} version.minor The minor version number.
 * @property {number} version.patch The patch version number.
 * @property {(string|boolean)} version.alpha The alpha version value,
 * otherwise `false` if the current version is not alpha.
 * @property {(string|boolean)} version.beta The beta version value,
 * otherwise `false` if the current version is not beta.
 */
HttpAdapter.version = {
  full: '<%= pkg.version %>',
  major: parseInt('<%= major %>', 10),
  minor: parseInt('<%= minor %>', 10),
  patch: parseInt('<%= patch %>', 10),
  alpha: '<%= alpha %>' !== 'false' ? '<%= alpha %>' : false,
  beta: '<%= beta %>' !== 'false' ? '<%= beta %>' : false
}

/**
 * Registered as `js-data-http` in NPM and Bower. The build of `js-data-http`
 * that works on Node.js is registered in NPM as `js-data-http-node`. The build
 * of `js-data-http` that does not bundle `axios` is registered in NPM and Bower
 * as `js-data-fetch`.
 *
 * __Script tag__:
 * ```javascript
 * window.HttpAdapter
 * ```
 * __CommonJS__:
 * ```javascript
 * var HttpAdapter = require('js-data-http')
 * ```
 * __ES6 Modules__:
 * ```javascript
 * import HttpAdapter from 'js-data-http'
 * ```
 * __AMD__:
 * ```javascript
 * define('myApp', ['js-data-http'], function (HttpAdapter) { ... })
 * ```
 *
 * @module js-data-http
 */

module.exports = HttpAdapter
