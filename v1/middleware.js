var story = require('storyboard').mainStory;

var db = require('../db');
var rolePerms = require('../rolePermissions');

var exprt = {
    auth: (req, res, next)=> {
        if (req.get('authorization')) {
            db.models.Token.find({where: {token: req.get('authorization')}}).then(token=> {
                if (token !== null && token !== undefined) {
                    req.token = token;
                    if (token.type === 'system') {
                        token.getGuilds = (query = {where: {online: true}})=> {
                            return db.models.Guild.findAll(query);
                        };
                        next();
                        return null;
                    } else {
                        next();
                        return null;
                    }
                } else next({code: 401});
            }).catch(err=> {
                next({code: 3000});
                story.error('sql', 'auth', {attach: err});
            })
        } else next({code: 401});
    },
    catcher: (req, res, next)=> {
        next({code: 4404})
    },
    error: (err, req, res, next)=> {
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
                }
        }
        res.status(err.code).json({data: payload, context: err.err_context || 'Error<ApiError>', time: new Date()});
    },
    apijson: (req, res, next)=> {
        res.apijson = (data, meta = {})=> {
            res.json({
                data,
                context: meta.context,
                count: (Array.isArray(data) ? data.length : undefined),
                total: meta.total || undefined,
                next: meta.next || undefined,
                time: new Date()
            })
        };
        next();
    },
    query_limit: (req, res, next) => {
        req.parsed_query = req.parsed_query || {};
        req.parsed_query.limit = 25;
        if (req.query.limit !== undefined) {
            var l = parseInt(req.query.limit);
            if (!isNaN(l)) {
                if (l > 100) req.parsed_query.limit = 100;
                else if (l < 1) req.parsed_query.limit = 1;
                else req.parsed_query.limit = l;
            }
        }
        next();
    },
    //middleware to parse ?offset to be passed to sequelize
    query_offset: (req, res, next)=> {
        req.parsed_query = req.parsed_query || {};
        req.parsed_query.offset = 0;
        if (req.query.offset !== undefined) {
            var o = parseInt(req.query.offset);
            if (!isNaN(o)) {
                req.parsed_query.offset = o;
            }
        }
        next();
    },
    //middleware that combines query_offset and query_limit
    query: (req, res, next)=> {
        exprt.middleware.query_limit(req, res, function () {
            exprt.middleware.query_offset(req, res, next);
        });
    },
    resolvePermissionGuild: (options = {perm: null, param: 'guild', required: null})=> {
        return (req, res, next)=> {
            if (options.perm === null)return next({code: 5900});
            if (req.params[options.param] === undefined)return next({code: 5900});
            exprt.auth(req, res, ()=> {
                if (req.token.type === 'system')next();
                else if (req.token.type === 'user')req.token.getUser().then(user=> {
                    if (user.custom_role > 5) {
                        next();
                    } else return user.getGuildRoles({
                        include: [{
                            model: db.models.Guild,
                            where: {gid: req.params[options.param]}
                        }]
                    })
                }).spread(role=> {
                    if (role !== undefined && role !== null) {
                        if (rolePerms[role.level][options.perm])next();
                        else next({code: 403});
                    } else next({code: 403});
                });
            });
        }
    }
};

module.exports = exprt;