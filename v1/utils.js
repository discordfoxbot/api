var exprt = {
    middleware: {
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
    }
};

module.exports = exprt;