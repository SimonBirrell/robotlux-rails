class CreateRobotInstances < ActiveRecord::Migration
  def change
    create_table :robot_instances do |t|
      t.string :name
      t.integer :org_id
      t.string :network
      t.string :master_key
      t.string :launch_command

      t.timestamps null: false
    end
  end
end
