require 'redis-namespace'

redis_connection = Redis.new
$redis = Redis::Namespace.new(:robotlux, :redis => redis_connection)
