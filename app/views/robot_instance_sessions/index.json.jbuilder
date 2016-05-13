json.array!(@robot_instance_sessions) do |robot_instance_session|
  json.extract! robot_instance_session, :id, :name, :robot_instance_id, :start_session, :end_session, :session_token
  json.url robot_instance_session_url(robot_instance_session, format: :json)
end
