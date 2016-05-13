json.array!(@robot_instances) do |robot_instance|
  json.extract! robot_instance, :id, :name, :org_id, :network, :master_key, :launch_command
  json.url robot_instance_url(robot_instance, format: :json)
end
