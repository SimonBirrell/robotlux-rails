class CreateAgentSessions < ActiveRecord::Migration
  def change
    create_table :agent_sessions do |t|
      t.integer :agent_id
      t.datetime :start_time
      t.datetime :end_time
      t.string :hostname
      t.string :ros_master_uri
      t.string :session_status
      t.string :token

      t.timestamps null: false
    end
  end
end
