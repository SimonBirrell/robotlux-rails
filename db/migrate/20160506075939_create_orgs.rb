class CreateOrgs < ActiveRecord::Migration
  def change
    create_table :orgs do |t|
      t.string :name
      t.string :slug

      t.timestamps null: false
    end
  end
end
