var app = require('express').Router();
var story = require('storyboard').mainStory;
var Promise = require('bluebird');

var db = require('../../db');
var utils = require('../utils');

app.get('/', utils.middleware.query, (req, res, next)=> {
    var where;
    if (req.query.type !== undefined) {
        where = where || {};
        where.type = req.query.type;
    }
    if (req.query.source !== undefined) {
        where = where || {};
        where.source = req.query.source;
    }
    db.models.Character.findAndCountAll({
        where: where,
        limit: req.parsed_query.limit,
        offset: req.parsed_query.offset,
        order: [['id', 'ASC']]
    }).then((result)=> {
        return Promise.all(result.rows.map((character)=> {
            var q = {verified: true};
            if (req.query.pic_verified !== undefined) {
                if (['true', 'false'].indexOf(req.query.pic_verified)) {
                    q.verified = req.query.pic_verified !== 'false';
                } else {
                    q = undefined;
                }
            }
            return character.getCharacterPictures({where: q});
        })).then((pictures)=> {
            res.apijson(result.rows.map((row)=> {
                return {
                    id: row.id,
                    name: row.name,
                    source: row.source,
                    type: row.type,
                    pictures: pictures[result.rows.indexOf(row)].map((picture)=> {
                        return picture.link
                    })
                };
            }), {
                total: result.count,
                offset: req.parsed_query.offset || 0,
                next: (result.rows.length < req.parsed_query.limit ? null : {
                    offset: req.parsed_query.offset + req.parsed_query.limit,
                    link: req.protocol + '://' + req.hostname + req.baseUrl + req.path + function () {
                        var ret = '?';
                        if (req.query.type !== undefined)ret += 'type=' + req.query.type + '&';
                        if (req.parsed_query.limit !== 25)ret += 'limit=' + req.parsed_query.limit + '&';
                        ret += 'offset=' + (req.parsed_query.offset + req.parsed_query.limit);
                        return ret;
                    }()
                }),
                context: 'Array<Character>'
            })
        });
    }).catch((err)=> {
        next({code: 5200});
        story.warn('SQL-Error', '', {attach: err});
    });
});

app.get('/:id', (req, res, next)=> {
    db.models.Character.find({where: {id: req.params.id}}).then((c)=> {
        var q = {verified: true};
        if (req.query.pic_verified !== undefined) {
            if (['true', 'false'].indexOf(req.query.pic_verified)) {
                q.verified = req.query.pic_verified !== 'false';
            } else {
                q = undefined;
            }
        }
        return c.getCharacterPictures({where: q}).then((pics)=> {
            res.apijson([{
                    id: c.id,
                    name: c.name,
                    source: c.source,
                    type: c.type,
                    pictures: pics.map((p)=> {
                        return p.link
                    })
                }],
                {count: 1, total: 1, context: 'Object<Character>'});
        });
    }).catch((err)=> {
        next({code: 5200});
        story.warn('SQL-Error', '', {attach: err});
    });
});

module.exports = app;