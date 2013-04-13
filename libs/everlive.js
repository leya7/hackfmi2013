/*global RSVP,reqwest,_*/
(function (ns) {
    var slice = Array.prototype.slice;
    var everliveUrl = "//api.everlive.com/v1/";
    var idField = "Id";
    function guardUnset(value, name, message) {
        if (!message)
            message = "The " + name + " is required";
        if (typeof value === "undefined" || value === null)
            throw new Error(message);
    }

    // An object that keeps information about an Everlive connecton
    function Setup(options) {
        this.url = everliveUrl;
        this.apiKey = null;
        this.masterKey = null;
        this.token = null;
        this.tokenType = null;
        this.scheme = 'https'; // http or https
        if (typeof options === "string")
            this.apiKey = options;
        else
            _.extend(this, options);
    }

    // An array keeping initialization functions called by the Everlive constructor.
    // These functions will be used to extend the functionality of an Everlive instance.
    var initializations = [];
    // The constructor of Everlive instances.
    // The entry point for the SDK.
    function Everlive(options) {
        var self = this;
        this.setup = new Setup(options);
        _.each(initializations, function (init) {
            init.func.call(self, options);
        });
        if (Everlive.$ === null)
            Everlive.$ = self;
    }
    // A reference to the current Everlive instance
    Everlive.$ = null;
    Everlive.idField = idField;
    Everlive.initializations = initializations;
    // Creates a new Everlive instance and set it as the current one
    Everlive.init = function (options) {
        Everlive.$ = null;
        return new Everlive(options);
    };

    var OperatorType = {
        query: 1,

        where: 100,

        and: 110,
        or: 111,
        not: 112,

        equal: 120,
        not_equal: 121,
        lt: 122,
        lte: 123,
        gt: 124,
        gte: 125,
        isin: 126,
        notin: 127,
        all: 128,
        size: 129,
        regex: 130,
        contains: 131,
        startsWith: 132,
        endsWith: 133,

        select: 200,
        exclude: 201,

        order: 300,
        order_desc: 301,

        skip: 400,
        take: 401
    };

    function Expression(operator, operands) {
        this.operator = operator;
        this.operands = operands || [];
    }
    Expression.prototype = {
        addOperand: function (operand) {
            this.operands.push(operand);
        }
    };

    // TODO add functionality for filtering by id
    function Query(filter, fields, sort, skip, take) {
        this.filter = filter;
        this.fields = fields;
        this.sort = sort;
        this.toskip = skip;
        this.totake = take;
        this.expr = new Expression(OperatorType.query);
    }
    Query.prototype = {
        where: function () {
            return new WhereQuery(this);
        },
        select: function () {
            return this._simple(OperatorType.select, arguments);
        },
        // TODO
        //exclude: function () {
        //    return this._simple(OperatorType.exclude, arguments);
        //},
        order: function (field) {
            return this._simple(OperatorType.order, [field]);
        },
        orderDesc: function (field) {
            return this._simple(OperatorType.order_desc, [field]);
        },
        skip: function (value) {
            return this._simple(OperatorType.skip, [value]);
        },
        take: function (value) {
            return this._simple(OperatorType.take, [value]);
        },
        toJson: function () {
            return new QueryBuilder(this).build();
        },
        _simple: function (op, oprs) {
            var args = slice.call(oprs);
            this.expr.addOperand(new Expression(op, args));
            return this;
        }
    };

    function WhereQuery(parentQuery, exprOp, singleOperand) {
        this.parent = parentQuery;
        this.single = singleOperand;
        this.expr = new Expression(exprOp || OperatorType.where);
        this.parent.expr.addOperand(this.expr);
    }
    WhereQuery.prototype = {
        and: function () {
            return new WhereQuery(this, OperatorType.and);
        },
        or: function () {
            return new WhereQuery(this, OperatorType.or);
        },
        not: function () {
            return new WhereQuery(this, OperatorType.not, true);
        },
        _simple: function (operator) {
            var args = slice.call(arguments, 1);
            this.expr.addOperand(new Expression(operator, args));
            return this._done();
        },
        eq: function (field, value) {
            return this._simple(OperatorType.equal, field, value);
        },
        ne: function (field, value) {
            return this._simple(OperatorType.not_equal, field, value);
        },
        gt: function (field, value) {
            return this._simple(OperatorType.gt, field, value);
        },
        gte: function (field, value) {
            return this._simple(OperatorType.gte, field, value);
        },
        lt: function (field, value) {
            return this._simple(OperatorType.lt, field, value);
        },
        lte: function (field, value) {
            return this._simple(OperatorType.lte, field, value);
        },
        isin: function (field, value) {
            return this._simple(OperatorType.isin, field, value);
        },
        notin: function (field, value) {
            return this._simple(OperatorType.notin, field, value);
        },
        all: function (field, value) {
            return this._simple(OperatorType.all, field, value);
        },
        size: function (field, value) {
            return this._simple(OperatorType.size, field, value);
        },
        regex: function (field, value, flags) {
            return this._simple(OperatorType.regex, field, value, flags);
        },
        startsWith: function (field, value, flags) {
            return this._simple(OperatorType.startsWith, field, value, flags);
        },
        endsWith: function (field, value, flags) {
            return this._simple(OperatorType.endsWith, field, value, flags);
        },
        done: function () {
            if (this.parent instanceof WhereQuery)
                return this.parent._done();
            else
                return this.parent;
        },
        _done: function () {
            if (this.single)
                return this.parent;
            else
                return this;
        }
    };
    WhereQuery.prototype.equal = WhereQuery.prototype.eq;
    WhereQuery.prototype.notEqual = WhereQuery.prototype.ne;
    WhereQuery.prototype.greaterThan = WhereQuery.prototype.gt;
    WhereQuery.prototype.greaterThanEqual = WhereQuery.prototype.gte;
    WhereQuery.prototype.lessThan = WhereQuery.prototype.lt;
    WhereQuery.prototype.lessThanEqual = WhereQuery.prototype.lte;

    function QueryBuilder(query) {
        this.query = query;
        this.expr = query.expr;
    }
    QueryBuilder.prototype = {
        // TODO merge the two objects before returning them
        build: function () {
            var query = this.query;
            if (query.filter || query.fields || query.sort || query.toskip || query.totake)
                return {
                    $where: query.filter || null,
                    $select: query.fields || null,
                    $sort: query.sort || null,
                    $skip: query.toskip || null,
                    $take: query.totake || null
                };
            return {
                $where: this._buildWhere(),
                $select: this._buildSelect(),
                $sort: this._buildSort(),
                $skip: this._getSkip(),
                $take: this._getTake()
            };
        },
        _getSkip: function () {
            var skipExpression = _.find(this.expr.operands, function (value, index, list) {
                return value.operator === OperatorType.skip;
            });
            return skipExpression ? skipExpression.operands[0] : null;
        },
        _getTake: function () {
            var takeExpression = _.find(this.expr.operands, function (value, index, list) {
                return value.operator === OperatorType.take;
            });
            return takeExpression ? takeExpression.operands[0] : null;
        },
        _buildSelect: function () {
            var selectExpression = _.find(this.expr.operands, function (value, index, list) {
                return value.operator === OperatorType.select;
            });
            var result = {};
            if (selectExpression) {
                _.reduce(selectExpression.operands, function (memo, value) {
                    memo[value] = 1;
                    return memo;
                }, result);
                return result;
            }
            else {
                return null;
            }
        },
        _buildSort: function () {
            var sortExpressions = _.filter(this.expr.operands, function (value, index, list) {
                return value.operator === OperatorType.order || value.operator === OperatorType.order_desc;
            });
            var result = {};
            if (sortExpressions.length > 0) {
                _.reduce(sortExpressions, function (memo, value) {
                    memo[value.operands[0]] = value.operator === OperatorType.order ? 1 : -1;
                    return memo;
                }, result);
                return result;
            }
            else {
                return null;
            }
        },
        _buildWhere: function () {
            var whereExpression = _.find(this.expr.operands, function (value, index, list) {
                return value.operator === OperatorType.where;
            });
            if (whereExpression) {
                return this._build(new Expression(OperatorType.and, whereExpression.operands));
            }
            else {
                return null;
            }
        },
        _build: function (expr) {
            if (this._isSimple(expr)) {
                return this._simple(expr);
            }
            else if (this._isRegex(expr)) {
                return this._regex(expr);
            }
            else if (this._isAnd(expr)) {
                return this._and(expr);
            }
            else if (this._isOr(expr)) {
                return this._or(expr);
            }
            else if (this._isNot(expr)) {
                return this._not(expr);
            }
        },
        _isSimple: function (expr) {
            return expr.operator >= OperatorType.equal && expr.operator <= OperatorType.size;
        },
        _simple: function (expr) {
            var term = {}, fieldTerm = {};
            var operands = expr.operands;
            var operator = this._translateoperator(expr.operator);
            if (operator) {
                term[operator] = operands[1];
            }
            else {
                term = operands[1];
            }
            fieldTerm[operands[0]] = term;
            return fieldTerm;
        },
        _isRegex: function (expr) {
            return expr.operator >= OperatorType.regex && expr.operator <= OperatorType.endsWith;
        },
        _regex: function (expr) {
            var fieldTerm = {};
            var regex = this._getRegex(expr);
            var regexValue = this._getRegexValue(regex);
            var operands = expr.operands;
            fieldTerm[operands[0]] = regexValue;
            return fieldTerm;
        },
        _getRegex: function (expr) {
            var pattern = expr.operands[1];
            var flags = expr.operands[2] ? expr.operands[2] : '';
            switch (expr.operator) {
                case OperatorType.regex:
                    return pattern instanceof RegExp ? pattern : new RegExp(pattern, flags);
                case OperatorType.startsWith:
                    return new RegExp(pattern + ".*", flags);
                case OperatorType.endsWith:
                    return new RegExp(".*" + pattern, flags);
            }
            throw new Error("Unknown operator type.");
        },
        _getRegexValue: function (regex) {
            var options = '';
            if (regex.global)
                options += 'g';
            if (regex.multiline)
                options += 'm';
            if (regex.ignoreCase)
                options += 'i';
            return { $regex: regex.source, $options: options };
        },
        _isAnd: function (expr) {
            return expr.operator === OperatorType.and;
        },
        _and: function (expr) {
            var i, l, term, result = {};
            var operands = expr.operands;
            for (i = 0, l = operands.length; i < l; i++) {
                term = this._build(operands[i]);
                result = this._andAppend(result, term);
            }
            return result;
        },
        _andAppend: function (andObj, newObj) {
            var i, l, key, value, newValue;
            var keys = _.keys(newObj);
            for (i = 0, l = keys.length; i < l; i++) {
                key = keys[i];
                value = andObj[key];
                if (typeof value === 'undefined') {
                    andObj[key] = newObj[key];
                }
                else {
                    newValue = newObj[key];
                    if (typeof value === "object" && typeof newValue === "object")
                        value = _.extend(value, newValue);
                    else
                        value = newValue;
                    andObj[key] = value;
                }
            }
            return andObj;
        },
        _isOr: function (expr) {
            return expr.operator === OperatorType.or;
        },
        _or: function (expr) {
            var i, l, term, result = [];
            var operands = expr.operands;
            for (i = 0, l = operands.length; i < l; i++) {
                term = this._build(operands[i]);
                result.push(term);
            }
            return { $or: result };
        },
        _isNot: function (expr) {
            return expr.operator === OperatorType.not;
        },
        _not: function (expr) {
            return { $not: this._build(expr.operands[0]) };
        },
        _translateoperator: function (operator) {
            switch (operator) {
                case OperatorType.equal:
                    return null;
                case OperatorType.not_equal:
                    return "$ne";
                case OperatorType.gt:
                    return "$gt";
                case OperatorType.lt:
                    return "$lt";
                case OperatorType.gte:
                    return "$gte";
                case OperatorType.lte:
                    return "$lte";
                case OperatorType.isin:
                    return "$in";
                case OperatorType.notin:
                    return "$nin";
                case OperatorType.all:
                    return "$all";
                case OperatorType.size:
                    return "$size";
            }
            throw new Error("Unknown operator type.");
        }
    };

    Everlive.Query = Query;
    Everlive.QueryBuilder = QueryBuilder;

    // The headers used by the Everlive services
    var Headers = {
        filter: "X-Everlive-Filter",
        select: "X-Everlive-Fields",
        sort: "X-Everlive-Sort",
        skip: "X-Everlive-Skip",
        take: "X-Everlive-Take"
    };

    // The Request type is an abstraction over Ajax libraries
    // A Request object needs information about the Everlive connection and initialization options
    function Request(setup, options) {
        guardUnset(setup, "setup");
        guardUnset(options, "options");
        this.setup = setup;
        this.method = null;
        this.endpoint = null;
        this.data = null;
        this.headers = {};
        // TODO success and error callbacks should be uniformed for all ajax libs
        this.success = null;
        this.error = null;
        this.parse = Request.parsers.simple;
        this._init(options);
        _.extend(this, options);
    }

    Request.prototype = {
        // Calls the underlying Ajax library
        send: function () {
            Everlive.sendRequest(this);
        },
        // Returns an authorization header used by the request.
        // If there is a logged in user for the Everlive instance then her/his authentication will be used.
        buildAuthHeader: function buildAuthHeader(setup, options) {
            var authHeaderValue = null;
            if (options && options.authHeaders === false)
                return authHeaderValue;
            if (setup.token) {
                authHeaderValue = (setup.tokenType || "bearer") + " " + setup.token;
            }
            else if (setup.masterKey) {
                authHeaderValue = 'masterkey ' + setup.masterKey;
            }
            if (authHeaderValue)
                return { "Authorization": authHeaderValue };
            else
                return null;
        },
        // Builds the URL of the target Everlive service
        buildUrl: function buildUrl(setup) {
            var url = '';
            if (typeof setup.scheme === "string")
                url += setup.scheme + ":";
            url += setup.url + setup.apiKey + "/";
            return url;
        },
        // Processes the given query to return appropriate headers to be used by the request
        buildQueryHeaders: function buildQueryHeaders(query) {
            if (query) {
                if (query instanceof Everlive.Query) {
                    return Request.prototype._buildQueryHeaders(query);
                }
                else {
                    return Request.prototype._buildFilterHeader(query);
                }
            }
            else {
                return {};
            }
        },
        // Initialize the Request object by using the passed options
        _init: function (options) {
            _.extend(this.headers, this.buildAuthHeader(this.setup, options), this.buildQueryHeaders(options.filter), options.headers);
        },
        // Translates an Everlive.Query to request headers
        _buildQueryHeaders: function (query) {
            query = query.toJson();
            var headers = {};
            if (query.$where !== null) {
                headers[Headers.filter] = JSON.stringify(query.$where);
            }
            if (query.$select !== null) {
                headers[Headers.select] = JSON.stringify(query.$select);
            }
            if (query.$sort !== null) {
                headers[Headers.sort] = JSON.stringify(query.$sort);
            }
            if (query.$skip !== null) {
                headers[Headers.skip] = query.$skip;
            }
            if (query.$take !== null) {
                headers[Headers.take] = query.$take;
            }
            return headers;
        },
        // Creates a header from a simple filter
        _buildFilterHeader: function (filter) {
            var headers = {};
            headers[Headers.filter] = JSON.stringify(filter);
            return headers;
        }
    };
    // Exposes the Request constructor
    Everlive.Request = Request;
    // A utility method for creating requests for the current Everlive instance
    Everlive.prototype.request = function (attrs) {
        return new Request(this.setup, attrs);
    };
    function parseResult(data) {
        if (typeof data === "string" && data.length > 0) {
            data = JSON.parse(data);
        }
        if (data) {
            return { result: data.Result, count: data.Count };
        }
        else {
            return data;
        }
    }
    function parseError(error) {
        if (typeof error === "string" && error.length > 0) {
            try {
                error = JSON.parse(error);
                return { message: error.message, code: error.errorCode };
            }
            catch (e) {
                return error;
            }
        }
        else {
            return error;
        }
    }
    function parseSingleResult(data) {
        if (typeof data === "string" && data.length > 0) {
            data = JSON.parse(data);
        }
        if (data) {
            return { result: data.Result };
        }
        else {
            return data;
        }
    }
    Request.parsers = {
        simple: {
            result: parseResult,
            error: parseError
        },
        single: {
            result: parseSingleResult,
            error: parseError
        }
    };
    // TODO built for reqwest
    if (typeof Everlive.sendRequest === "undefined") {
        Everlive.sendRequest = function (request) {
            var url = request.buildUrl(request.setup) + request.endpoint;
            var data = request.method === "GET" ? request.data : JSON.stringify(request.data);
            //$.ajax(url, {
            reqwest({
                url: url,
                method: request.method,
                data: data,
                headers: request.headers,
                type: "json",
                contentType: 'application/json',
                crossOrigin: true,
                //processData: request.method === "GET",
                success: function (data, textStatus, jqXHR) {
                    request.success.call(request, request.parse.result(data));
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    request.error.call(request, request.parse.error(jqXHR.responseText));
                }
            });
        };
    }

    Everlive.utils = {};
    // rsvp promises
    Everlive.getCallbacks = function (success, error) {
        var promise;
        if (typeof success !== "function" && typeof error !== "function") {
            promise = new RSVP.Promise();
            success = function (data) {
                promise.resolve(data);
            };
            error = function (error) {
                promise.reject(error);
            };
        }
        return { promise: promise, success: success, error: error };
    };
    // whenjs promises
    //Everlive.getCallbacks = function (success, error) {
    //    var promise;
    //    if (typeof success !== "function" && typeof error !== "function") {
    //        promise = when.defer();
    //        success = function (data) {
    //            promise.resolve(data);
    //        };
    //        error = function (error) {
    //            promise.reject(error);
    //        };
    //    }
    //    return { promise: promise.promise, success: success, error: error };
    //};
    function buildPromise(operation, success, error) {
        var callbacks = Everlive.getCallbacks(success, error);
        operation(callbacks.success, callbacks.error);
        return callbacks.promise;
    }

    (function (ns) {
        // TODO implement options: { requestSettings: { executeServerCode: false } }. power fields queries could be added to that options argument
        ns.get = function (setup, collectionName, filter, success, error) {
            return buildPromise(function (success, error) {
                var request = new Request(setup, {
                    method: "GET",
                    endpoint: collectionName,
                    filter: filter,
                    success: success,
                    error: error
                });
                request.send();
            }, success, error);
        };
        // TODO handle options
        // TODO think to pass the id as a filter
        ns.getById = function (setup, collectionName, id, success, error) {
            return buildPromise(function (success, error) {
                var request = new Request(setup, {
                    method: "GET",
                    endpoint: collectionName + "/" + id,
                    parse: Request.parsers.single,
                    success: success,
                    error: error
                });
                request.send();
            }, success, error);
        };
        ns.count = function (setup, collectionName, filter, success, error) {
            return buildPromise(function (success, error) {
                var request = new Request(setup, {
                    method: "GET",
                    endpoint: collectionName + "/_count",
                    filter: filter,
                    parse: Request.parsers.single,
                    success: success,
                    error: error
                });
                request.send();
            }, success, error);
        };
        ns.create = function (setup, collectionName, data, success, error) {
            return buildPromise(function (success, error) {
                var request = new Request(setup, {
                    method: "POST",
                    endpoint: collectionName,
                    data: data,
                    parse: Request.parsers.single,
                    success: success,
                    error: error
                });
                request.send();
            }, success, error);
        };
        ns.rawUpdate = function (setup, collectionName, attrs, filter, success, error) {
            return buildPromise(function (success, error) {
                var endpoint = collectionName;
                var ofilter = null; // request options filter
                if (typeof filter === "string") // if filter is string than will update a single item using the filter as an identifier
                    endpoint += "/" + filter;
                else if (typeof filter === "object") // else if it is an object than we will use it as a query filter
                    ofilter = filter;
                var request = new Request(setup, {
                    method: "PUT",
                    endpoint: endpoint,
                    data: attrs,
                    filter: ofilter,
                    success: success,
                    error: error
                });
                request.send();
            }, success, error);
        };
        ns._update = function (setup, collectionName, attrs, filter, success, error, single, replace) {
            return buildPromise(function (success, error) {
                var endpoint = collectionName;
                if (single)
                    endpoint += "/" + attrs[idField];
                var data = {};
                data[replace ? "$replace" : "$set"] = attrs;
                var request = new Request(setup, {
                    method: "PUT",
                    endpoint: endpoint,
                    data: data,
                    filter: filter,
                    success: success,
                    error: error
                });
                request.send();
            }, success, error);
        };
        ns.updateSingle = function (setup, collectionName, model, success, error) {
            return ns._update(setup, collectionName, model, null, success, error, true, false);
        };
        ns.update = function (setup, collectionName, model, filter, success, error) {
            return ns._update(setup, collectionName, model, filter, success, error, false, false);
        };
        ns.replaceSingle = function (setup, collectionName, model, success, error) {
            return ns._update(setup, collectionName, model, null, success, error, true, true);
        };
        ns._destroy = function (setup, collectionName, attrs, filter, success, error, single) {
            return buildPromise(function (success, error) {
                var endpoint = collectionName;
                if (single)
                    endpoint += "/" + attrs[idField];
                var request = new Request(setup, {
                    method: "DELETE",
                    endpoint: endpoint,
                    filter: filter,
                    success: success,
                    error: error
                });
                request.send();
            }, success, error);
        };
        ns.destroySingle = function (setup, collectionName, model, success, error) {
            return ns._destroy(setup, collectionName, model, null, success, error, true);
        };
        ns.destroy = function (setup, collectionName, filter, success, error) {
            return ns._destroy(setup, collectionName, null, filter, success, error, false);
        };
    }(Everlive.raw = {}));

    function Data(setup, collectionName) {
        this.setup = setup;
        this.collectionName = collectionName;
    }
    Everlive.prototype.data = function (collectionName) {
        return new Data(this.setup, collectionName);
    };
    (function (obj) {
        var functions = Everlive.raw;
        function add(func) {
            return function () {
                var args = slice.call(arguments);
                return func.apply(null, [this.setup, this.collectionName].concat(args));
            };
        }
        for (var func in functions) {
            if (func[0] !== '_') {
                obj[func] = add(functions[func]);
            }
        }
    }(Data.prototype));

    var addUsersFunctions = function (ns) {
        ns._loginSuccess = function (data) {
            var result = data.result;
            var setup = this.setup;
            setup.token = result.access_token;
            setup.tokenType = result.token_type;
        };
        ns._logoutSuccess = function () {
            var setup = this.setup;
            setup.token = null;
            setup.tokenType = null;
        };
        ns.register = function (username, password, attrs, success, error) {
            guardUnset(username, "username");
            guardUnset(password, "password");
            var user = {
                Username: username,
                Password: password
            };
            _.extend(user, attrs);
            return Everlive.raw.create(this.setup, "Users", user, success, error);
        };
        ns.login = function (username, password, success, error) {
            var self = this;
            return buildPromise(function (success, error) {
                var request = new Request(self.setup, {
                    method: "POST",
                    endpoint: "oauth/token",
                    data: {
                        username: username,
                        password: password,
                        grant_type: "password"
                    },
                    authHeaders: false,
                    parse: Request.parsers.single,
                    success: function () {
                        self._loginSuccess.apply(self, arguments);
                        success.apply(null, arguments);
                    },
                    error: error
                });
                request.send();
            }, success, error);
        };
        ns.currentUser = function (success, error) {
            return Everlive.raw.getById(this.setup, "Users", "me", success, error);
        };
        ns.changePassword = function (username, password, newPassword, keepTokens, success, error) {
            var self = this;
            return buildPromise(function (success, error) {
                var endpoint = "Users/changepassword";
                if (keepTokens)
                    endpoint += "?keepTokens=true";
                var request = new Request(self.setup, {
                    method: "POST",
                    endpoint: endpoint,
                    data: {
                        Username: username,
                        Password: password,
                        NewPassword: newPassword
                    },
                    authHeaders: false,
                    parse: Request.parsers.single,
                    success: success,
                    error: error
                });
                request.send();
            }, success, error);
        };
        ns.logout = function (success, error) {
            var self = this;
            return buildPromise(function (success, error) {
                var request = new Request(self.setup, {
                    method: "GET",
                    endpoint: "oauth/logout",
                    success: function () {
                        self._logoutSuccess.apply(self, arguments);
                        success.apply(null, arguments);
                    },
                    error: error
                });
                request.send();
            }, success, error);
        };
    };

    function initDefault() {
        this.Users = this.data("Users");
        addUsersFunctions(this.Users);
    }

    initializations.push({ name: "default", func: initDefault });

    ns.Everlive = Everlive;
}(this));