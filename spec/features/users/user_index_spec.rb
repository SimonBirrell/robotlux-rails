include Warden::Test::Helpers
Warden.test_mode!

# Feature: User index page
#   As a user
#   I want to see a list of users
#   So I can see who has registered
feature 'User index page', :devise do

  after(:each) do
    Warden.test_reset!
  end

  # Scenario: User listed on index page
  #   Given I am signed in
  #   When I visit the user index page
  #   Then I see my own email address
  scenario 'user sees own email address' do
    user = FactoryGirl.create(:user, :admin)
    login_as(user, scope: :user)
    visit users_path
    expect(page).to have_content user.email
  end

  scenario 'user invites another user' do
    user = FactoryGirl.create(:user, :admin)
    login_as(user, scope: :user)
    visit users_path
    expect(User.count).to eq 1

    click_link 'invite_new_user'

    fill_in :user_name, with: 'Lux Interior'
    fill_in :user_email, with: 'test@test.com'
    click_button 'Send an invitation'
    expect(User.count).to eq 2
    invited_user = User.last
    expect(invited_user.id).to be_present
    expect(invited_user.email).to eq 'test@test.com'
    expect(invited_user.org_id).to eq user.org_id

  end

end
