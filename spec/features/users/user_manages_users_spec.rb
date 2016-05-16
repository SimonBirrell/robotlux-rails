feature 'User manages users', :devise do 

	scenario 'user sees only users from same org on org page' do
		set_up_users_and_go_to_org_page(:user)
		expect_to_only_see_org_users
	end

	scenario 'admin sees only users from same org on org page' do
		set_up_users_and_go_to_org_page(:admin)
		expect_to_only_see_org_users
	end

	scenario 'org_admin sees only users from same org on users page' do
		set_up_users_and_go_to_org_page(:org_admin)
		visit '/users'
		expect_to_only_see_org_users
	end

	scenario 'admin sees all non-agent users on users page' do
		set_up_users_and_go_to_org_page(:admin)
		visit '/users'
		expect_to_see_all_non_agent_users
	end

	def expect_to_only_see_org_users
    	expect(page).to have_content 'user1a'
    	expect(page).to have_content 'user1b'
    	expect(page).not_to have_content 'user2a'
    	expect(page).not_to have_content 'user2b'
	end

	def expect_to_see_all_non_agent_users
    	expect(page).to have_content 'user1a'
    	expect(page).to have_content 'user1b'
    	expect(page).to have_content 'user2a'
    	expect(page).to have_content 'user2b'
	end

	def set_up_users_and_go_to_org_page(role)
		org1 = FactoryGirl.create :org, slug: 'org1'
		org2 = FactoryGirl.create :org, slug: 'org2'		
		agent1 = FactoryGirl.create :agent, org: org1, slug: 'agent1'
		agent2 = FactoryGirl.create :agent, org: org2, slug: 'agent2'
	    user1a = FactoryGirl.create(:user, org: org1, name: 'user1a', role: role)
	    user1b = FactoryGirl.create(:user, org: org1, name: 'user1b')
	    user2a = FactoryGirl.create(:user, org: org2, name: 'user2a')
	    user2b = FactoryGirl.create(:user, org: org2, name: 'user2b')
    	signin(user1a.email, user1a.password)
    	click_link 'org-show'
    	expect(page).not_to have_css '#show-user-' + agent1.user.id.to_s
    	expect(page).not_to have_css '#show-user-' + agent2.user.id.to_s
	end
	
end