feature 'Robots', :devise do

  scenario 'user can see robots page' do
  	robot_instance = FactoryGirl.create :robot_instance, name: 'Robby'
    user = FactoryGirl.create(:user)
    signin(user.email, user.password)
    expect(page).to have_content I18n.t 'login.sign_out'
    click_link I18n.t 'robot_instances'
    expect(page).to have_content 'Robby'
    expect(page).to have_content user.org.name
    click_link 'Robby'
    expect(page).to have_content 'Robby'
    click_link 'edit-record'
    fill_in 'robot_instance_name', with: 'Robot Monster'
    fill_in 'robot_instance_network', with: 'new_network'
    fill_in 'robot_instance_master_key', with: 'new_master_key'
    fill_in 'robot_instance_launch_command', with: 'new_launch_command'
    click_button 'Update Robot instance'
    expect(page).to have_content 'Robot Monster'
    expect(page).to have_content 'new_network'
    expect(page).to have_content 'new_master_key'
    expect(page).to have_content 'new_launch_command'
  end

end  