class AddUserIdToAgents < ActiveRecord::Migration
  def change
    add_column :agents, :user_id, :integer
  end
end
