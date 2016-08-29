var story = require('storyboard').mainStory;

var db = require('../db');

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
    error: (err, req, res, next)=> {
        var payload;
        switch (err.code) {
            case 401:
                payload = {
                    message: 'Token invalid. Please supply a valid token.',
                    error: 'invalid_token'
                };
                break;
            case 403:
                payload = {
                    message: 'Insufficient Permission. The Token you supplied does not have the permission to access this ressource.',
                    error: 'insufficient_permission'
                };
                break;
            case 3000:
                err.code = 500;
                payload = {
                    message: 'The server encountered an error querying the database. Please try again later!',
                    error: 'database'
                };
                break;
            default:
                err.code = 500;
                payload = {
                    message: 'The server encountered an unknown error.',
                    error: 'unknown'
                }
        }
        res.status(err.code).json(payload);
    }
};

module.exports = exprt;