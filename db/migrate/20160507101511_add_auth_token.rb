class AddAuthToken < ActiveRecord::Migration
  def change
  	User.find_each do |user|
  		# Generate an auth_token
  		user.save!
  	end
  end
end
