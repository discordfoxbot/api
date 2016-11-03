var story = require('storyboard').mainStory;

var db = require('../lib/db');
var rolePerms = require('../lib/rolePermissions');
var limiter = require('../lib/rateLimiter');

var exprt = {
    auth: ()=> {
        return (req, res, next)=> {
            if (req.get('authorization') !== undefined) {
                db.models.Token.find({where: {token: req.get('authorization')}}).then(token=> {
                    if (token !== null && token !== undefined) {
                        req.token = token;
                        if (token.type === 'system') {
                            token.getGuilds = (query = {where: {online: true}})=> {
                                //noinspection JSUnresolvedFunction
                                return db.models.Guild.findAll(query);
                            };
                            next();
                            //return null;
                        } else {
                            next();
                            //return null;
                        }
                    } else next({code: 401});
                }).catch(err=> {
                    next({code: 5200});
                    story.error('sql', 'auth', {attach: err});
                })
            } else next({code: 401});
        }
    },
    resolveAuth: ()=> {
        return (req, res, next)=> {
            if (req.get('authorization') !== undefined) {
                db.models.Token.find({where: {token: req.get('authorization')}}).then(token=> {
                    if (token !== null && token !== undefined) {
                        req.token = token;
                        if (token.type === 'system') {
                            token.getGuilds = (query = {where: {online: true}})=> {
                                //noinspection JSUnresolvedFunction
                                return db.models.Guild.findAll(query);
                            };
                            next();
                            //return null;
                        } else {
                            next();
                            //return null;
                        }
                    } else next();
                }).catch(err=> {
                    next();
                    story.error('sql', 'auth', {attach: err});
                })
            } else next();
        }
    },
    catcher: ()=> {
        return (req, res, next)=> {
            next({code: 4404})
        }
    },
    error: ()=> {
        //noinspection JSUnusedLocalSymbols
        return (err, req, res, next)=> {
            var payload;
            switch (err.code) {
                case 301 || 302:
                    if (req.method === 'GET') {
                        res.status(err.code).redirect(err.location);
                    } else {
                        err.code = 400;
                        payload = {
                            message: 'The requested resource is ot available under this uri. Please use the uri specified in the location variable',
                            error: 'location_invalid',
                            location: err.location
                        };
                        err.err_context = 'Error<ApiLocationError>'
                    }
                    break;
                case 401:
                    payload = {
                        message: 'Token invalid. Please supply a valid token.',
                        error: 'invalid_token'
                    };
                    break;
                case 403:
                    payload = {
                        message: 'Insufficient Permission. The Token you supplied does not have the permission to access this resource.',
                        error: 'insufficient_permission'
                    };
                    break;
                case 404:
                    payload = {
                        message: 'The requested resource could not be found.',
                        error: 'not_found'
                    };
                    break;
                case 429:
                    payload = {
                        message: `You've exceeded the ratelimit for this key. You will have to wait ${err.wait} ms before you make any further request. Any further request will lead to blacklisting your ip for up to 48 hours.`,
                        error: 'rate_limit_exceeded',
                        wait: err.wait
                    };
                    break;
                case 4006:
                    err.code = 400;
                    payload = {
                        message: 'Invalid Origin Header',
                        error: 'invalid_origin_header'
                    };
                    break;
                case 4007:
                    err.code = 400;
                    payload = {
                        message: 'The given origin is not allowed to access this endpoint.',
                        error: 'origin_not_allowed'
                    };
                    break;
                case 4404:
                    err.code = 404;
                    payload = {
                        message: 'The requested endpoint does not exist or is not reachable with this method',
                        error: 'invalid_endpoint'
                    };
                    break;
                case 5200:
                    err.code = 500;
                    payload = {
                        message: 'The server encountered an error querying the database. Please try again later!',
                        error: 'database'
                    };
                    break;
                case 5900:
                    err.code = 500;
                    payload = {
                        message: 'There was an error in the application providing this api.',
                        error: 'code_internal'
                    };
                    break;
                default:
                    err.code = 500;
                    payload = {
                        message: 'The server encountered an unknown error.',
                        error: 'unknown'
                    };
                    story.error('http', 'A route threw an unknown error.', {attach: err});
                    break;
            }
            res.status(err.code).json({
                data: payload,
                context: err.err_context || 'Error<ApiError>',
                time: new Date(),
                warnings: req.warnings
            });
        }
    },
    apijson: ()=> {
        return (req, res, next)=> {
            res.apijson = (data, meta = {})=> {
                res.json({
                    data,
                    context: meta.context,
                    count: (Array.isArray(data) ? data.length : undefined),
                    total: meta.total,
                    next: meta.next,
                    time: new Date(),
                    cache: meta.cache ? meta.cache : false,
                    warnings: req.warnings
                })
            };
            next();
        }
    },
    caching: ()=> {
        return (req, res, next)=> {
            res.set({'Cache-Control': 'no-cache, no-store, must-revalidate', expires: new Date()});
            next();
        }
    },
    cors: (allowed_orgins)=> {
        return (req, res, next)=> {
            res.set({
                'access-control-allow-credentials': true,
                'access-control-allow-methods': 'POST, GET, PUT, PATCH, DELETE',
                'access-control-allow-headers': 'Content-Type, Authorization'
            });
            if (!allowed_orgins || allowed_orgins.length === 0) {
                if (req.get('origin'))res.set('access-control-allow-origin', req.get('origin'));
                else res.set('access-control-allow-origin', '*');
                next();
            } else {
                if (!req.get('origin'))next({code: 4006});
                else if (allowed_orgins.includes(req.get('origin'))) {
                    res.set('access-control-allow-origin', req.get('origin'));
                    next();
                } else next({code: 4007});
            }
        }
    },
    head: ()=> {
        return (req, res, next)=> {
            exprt.cors(req, res, (err)=> {
                if (err)next(err);
                else res.status(200).end();
            })
        }
    },
    query_limit: () => {
        return (req, res, next)=> {
            exprt.resolveAuth()(req, res, ()=> {
                req.parsed_query = req.parsed_query || {};
                req.parsed_query.limit = 25;
                if (req.query.limit !== undefined) {
                    var l = parseInt(req.query.limit);
                    if (!isNaN(l)) {
                        if (req.token) {
                            if (req.token.type === 'system' || req.token.limit === 0)req.parsed_query.limit = l;
                            else if (req.token.query_limit > l) {
                                req.parsed_query.limit = 100;
                                req.warnings.push({
                                    type: 'error',
                                    msg: `Limit too high. Your requested object limit was too high and therefore set to your keys maximum of ${req.token.query_limit || 100}`,
                                    error: 'query_limit_exceeded'
                                });
                            }
                            else if (l < 1) req.parsed_query.limit = 1;
                            else req.parsed_query.limit = l;
                        } else {
                            if (l > 100) {
                                req.parsed_query.limit = 100;
                                req.warnings.push({
                                    type: 'error',
                                    msg: `Limit too high. Your requested object limit was too high and therefore set to your keys maximum of ${100}`,
                                    error: 'query_limit_exceeded'
                                });
                            }
                            else if (l < 1) req.parsed_query.limit = 1;
                            else req.parsed_query.limit = l;
                        }


                    }
                }
                next();
            });
        }
    },
    //middleware to parse ?offset to be passed to sequelize
    query_offset: ()=> {
        return (req, res, next)=> {
            req.parsed_query = req.parsed_query || {};
            req.parsed_query.offset = 0;
            if (req.query.offset !== undefined) {
                var o = parseInt(req.query.offset);
                if (!isNaN(o)) {
                    req.parsed_query.offset = o;
                }
            }
            next();
        }
    },
    //middleware that combines query_offset and query_limit
    query: ()=> {
        return (req, res, next)=> {
            exprt.query_limit()(req, res, function () {
                exprt.query_offset()(req, res, next);
            });
        }
    },
    ratelimit: ()=> {
        return (req, res, next)=> {
            if (req.get('Authorization')) limiter.token(req.get('Authorization'), (err, left)=> {
                if (err)next({code: 5200});
                else if (left)next({code: 429, wait: left});
                else next();
            });
            else limiter.ip(req.ip, (err, left)=> {
                if (err)next({code: 5200});
                else if (left)next({code: 429, wait: left});
                else next();
            })
        }
    },
    resolvePermissionGuild: (options)=> {
        options.param = options.param || 'guild';
        options.requireAll = options.requireAll || false;
        options.perm = options.perm || null;
        return (req, res, next)=> {
            if (options.perm === null)return next({code: 5900});
            if (req.params[options.param] === undefined)return next({code: 5900});
            exprt.auth()(req, res, (err)=> {
                if (err) return next(err);
                if (req.token.type === 'system')next();
                else if (req.token.type === 'user') { //noinspection JSUnresolvedFunction
                    req.token.getUser().then(user=> {
                        if (user.custom_role > 5) {
                            next();
                        } else { //noinspection JSUnresolvedFunction
                            return user.getGuildRoles({
                                include: [{
                                    model: db.models.Guild,
                                    where: {gid: req.params[options.param]}
                                }]
                            })
                        }
                    }).spread(role=> {
                        if (role !== undefined && role !== null) {
                            if (Array.isArray(options.perm)) {
                                if (options.requireAll) {
                                    for (let e in options.perm) {
                                        //noinspection JSUnfilteredForInLoop
                                        if (!rolePerms[role.level][e])return next({code: 403});
                                    }
                                    next();
                                } else {
                                    for (let e in options.perm) {
                                        //noinspection JSUnfilteredForInLoop
                                        if (rolePerms[role.level][e])return next();
                                    }
                                    next({code: 403});
                                }
                            } else if (rolePerms[role.level][options.perm])next();
                            else next({code: 403});
                        } else next({code: 403});
                    });
                }
            });
        }
    },
    buildStructure: ()=> {
        return (req, res, next)=> {
            req.warnings = [];
            next();
        }
    },
    hostnameDeprecation: ()=> {
        return (req, res, next)=> {
            if (req.hostname === 'foxbot.fuechschen.org')req.warnings.push({
                type: 'error',
                msg: 'This API-Url is deprecated and is only supported for legacy clients. Use https://kitsune.fuechschen.org/api/v1 for all new clients.',
                error: 'deprecated_url'
            });
            next();
        }
    },
    authMissingWarning: ()=> {
        return (req, res, next)=> {
            if (!req.get('Authorization'))req.warnings.push({
                type: 'warning',
                msg: 'You\'ve send this request without an Authorization token. While this still works, non-authorized request are subject to much stricter ratelimits.',
                error: 'token_missing'
            });
            next();
        }
    },
    resolveToken: ()=> {
        return (req, res, next)=> {
            if (req.get('Authorization'))req.auth_token = req.get('Authorization');
            else if (req.query.auth_token && typeof req.query.auth_token === 'string')req.auth_token = req.query.auth_token;
            else req.auth_token = null;
            next();
        }
    }
};

module.exports = exprt;