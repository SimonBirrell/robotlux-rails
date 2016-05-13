class AddRobotInstanceSessionIdToAgentSession < ActiveRecord::Migration
  def change
    add_column :agent_sessions, :robot_instance_session_id, :integer
  end
end
