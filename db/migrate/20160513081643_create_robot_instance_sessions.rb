class CreateRobotInstanceSessions < ActiveRecord::Migration
  def change
    create_table :robot_instance_sessions do |t|
      t.string :name
      t.string :robot_instance_id
      t.datetime :start_session
      t.datetime :end_session
      t.string :session_token

      t.timestamps null: false
    end
  end
end
