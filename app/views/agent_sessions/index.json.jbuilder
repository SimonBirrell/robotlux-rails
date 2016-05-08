json.array!(@agent_sessions) do |agent_session|
  json.extract! agent_session, :id, :agent_id, :start_time, :end_time, :hostname, :ros_master_uri, :session_status, :token
  json.url agent_session_url(agent_session, format: :json)
end
