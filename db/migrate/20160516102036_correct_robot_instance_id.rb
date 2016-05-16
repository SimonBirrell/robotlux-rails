class CorrectRobotInstanceId < ActiveRecord::Migration
  def change
  	remove_column :robot_instance_sessions, :robot_instance_id
  	add_column :robot_instance_sessions, :robot_instance_id, :integer
  end
end
