local result
if type(ARGV[3]) == "string" then
    result = redis.pcall("json.set", KEYS[1], ARGV[1], ARGV[2], ARGV[3])
else
    result = redis.pcall("json.set", KEYS[1], ARGV[1], ARGV[2])
end
if type(result) == "table" and result.ok then
    redis.call("publish", ARGV[1], ARGV[2])
end
return result
