module Features
  module SessionHelpers
    def sign_up_with(email, password, confirmation, name, org_name)
      visit new_user_registration_path
      fill_in 'Name', with: name
      fill_in 'Email', with: email
      fill_in 'Password', with: password, match: :prefer_exact
      fill_in 'Password confirmation', with: confirmation, match: :prefer_exact
      fill_in 'Organization', with: org_name
      click_button 'Sign up'
    end

    def signin(email, password)
      visit new_user_session_path
      fill_in 'user_email', with: email
      fill_in 'user_password', with: password
      click_button 'Sign in'
    end
  end
end
