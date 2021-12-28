cjson.encode_sparse_array(false,0); -- disable sparse array limit
return redis.call(
    'json.set',
    KEYS[1],
    ARGV[1],
    cjson.encode({ [tonumber(ARGV[2])] = {} }),
    'NX'
);