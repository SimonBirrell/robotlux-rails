require 'redis-namespace'

redis_connection = Redis.new(url: ENV["REDIS_URL"])
$redis = Redis::Namespace.new(:robotlux, :redis => redis_connection)
