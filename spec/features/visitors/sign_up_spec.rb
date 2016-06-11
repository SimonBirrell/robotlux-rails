# Feature: Sign up
#   As a visitor
#   I want to sign up
#   So I can visit protected areas of the site
feature 'Sign Up', :devise do

  # Scenario: Visitor can sign up with valid email address and password
  #   Given I am not signed in
  #   When I sign up with a valid email address and password
  #   Then I see a successful sign up message
  scenario 'visitor can sign up with valid email address, password, name and org name' do
    number_orgs = Org.count
    number_users = User.count
    puts "Starting org count #{number_orgs}"
    sign_up_with('test@example.com', 'please123', 'please123', 'simon', 'acme')
    txts = [I18n.t( 'devise.registrations.signed_up'), I18n.t( 'devise.registrations.signed_up_but_unconfirmed')]
    expect(page).to have_content(/.*#{txts[0]}.*|.*#{txts[1]}.*/)
    expect(User.count).to eq number_users + 1
    expect(Org.count).to eq number_orgs + 1
    expect(User.first.org). to eq Org.first
  end

  scenario 'visitor cannot sign up with existing org slug', focus: true do
    Org.delete_all
    org1 = Org.create name: 'Acme Ltd'
    puts "TEST #{org1.inspect}"
    org1.save!
    expect(org1.id).to be_present
    sign_up_with('test@example.com', 'please123', 'please123', 'simon', 'Acme Ltd')
    expect(page).to have_content "Organization name already taken."
  end

  scenario 'visitor cannot sign up with missing name' do
    sign_up_with('test@example.com', 'please123', 'please123', '', 'acme')
    expect(page).to have_content "Name can't be blank"
  end

  scenario 'visitor cannot sign up with missing org name' do
    sign_up_with('test@example.com', 'please123', 'please123', 'simon', '')
    expect(page).to have_content "Organization name can't be blank"
  end

  # Scenario: Visitor cannot sign up with invalid email address
  #   Given I am not signed in
  #   When I sign up with an invalid email address
  #   Then I see an invalid email message
  scenario 'visitor cannot sign up with invalid email address' do
    sign_up_with('bogus', 'please123', 'please123', 'simon', 'acme')
    expect(page).to have_content 'Email is invalid'
  end

  # Scenario: Visitor cannot sign up without password
  #   Given I am not signed in
  #   When I sign up without a password
  #   Then I see a missing password message
  scenario 'visitor cannot sign up without password' do
    sign_up_with('test@example.com', '', '', 'simon', 'acme')
    expect(page).to have_content "Password can't be blank"
  end

  # Scenario: Visitor cannot sign up with a short password
  #   Given I am not signed in
  #   When I sign up with a short password
  #   Then I see a 'too short password' message
  scenario 'visitor cannot sign up with a short password' do
    sign_up_with('test@example.com', 'please', 'please', 'simon', 'acme')
    expect(page).to have_content "Password is too short"
  end

  # Scenario: Visitor cannot sign up without password confirmation
  #   Given I am not signed in
  #   When I sign up without a password confirmation
  #   Then I see a missing password confirmation message
  scenario 'visitor cannot sign up without password confirmation' do
    sign_up_with('test@example.com', 'please123', '', 'simon', 'acme')
    expect(page).to have_content "Password confirmation doesn't match"
  end

  # Scenario: Visitor cannot sign up with mismatched password and confirmation
  #   Given I am not signed in
  #   When I sign up with a mismatched password confirmation
  #   Then I should see a mismatched password message
  scenario 'visitor cannot sign up with mismatched password and confirmation' do
    sign_up_with('test@example.com', 'please123', 'mismatch', 'simon', 'acme')
    expect(page).to have_content "Password confirmation doesn't match"
  end

end
