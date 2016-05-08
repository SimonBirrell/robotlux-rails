class CreateAgents < ActiveRecord::Migration
  def change
    create_table :agents do |t|
      t.string :name
      t.string :slug
      t.integer :org_id
      t.string :guid
      t.string :hostname
      t.string :ros_master_uri
      t.string :network
      t.string :authorization

      t.timestamps null: false
    end
  end
end
