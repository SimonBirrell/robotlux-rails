json.array!(@agents) do |agent|
  json.extract! agent, :id, :name, :slug, :org_id, :guid, :hostname, :ros_master_uri, :network, :authorization
  json.url agent_url(agent, format: :json)
end
