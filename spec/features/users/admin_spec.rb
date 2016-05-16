feature 'Admin', :devise do

	scenario 'Admin user looks at org page and sees orgs' do
		set_up_org_and_user(:admin)
		click_link 'admin-orgs'

		expect(page).to have_content 'org1'
		expect(page).to have_content 'org2'
	end

	scenario 'Normal user looks at org page and sees only own org' do
		set_up_org_and_user(:user)
		visit '/orgs'

		expect(page).to have_content 'org1'
		expect(page).not_to have_content 'org2'
	end

	scenario 'Admin user looks at agent page and sees agents' do
		set_up_org_and_user(:admin)
		set_up_agents
		visit '/agents'

		expect(page).to have_content 'agent1'
		expect(page).to have_content 'agent2'
	end

	scenario 'Normal user looks at agent page and sees only own org agents' do
		set_up_org_and_user(:user)
		set_up_agents
		visit '/agents'

		expect(page).to have_content 'agent1'
		expect(page).not_to have_content 'agent2'
	end

	scenario 'Admin user looks at agent_sessions page and sees agent_sessions' do
		set_up_org_and_user(:admin)
		set_up_agent_sessions
		visit '/agent_sessions'

		expect(page).to have_content 'hostname1'
		expect(page).to have_content 'hostname2'
	end

	scenario 'Normal user looks at agent_sessions page and sees only own org agent_sessions' do
		set_up_org_and_user(:user)
		set_up_agent_sessions
		visit '/agent_sessions'

		expect(page).to have_content 'hostname1'
		expect(page).not_to have_content 'hostname2'
	end

	scenario 'Admin user looks at robot instance page and sees robot instances' do
		set_up_org_and_user(:admin)
		set_up_robot_instances
		visit '/robot_instances'

		expect(page).to have_content 'robot_instance1'
		expect(page).to have_content 'robot_instance2'
	end

	scenario 'Normal user looks at robot instance page and sees only own org robot instances' do
		set_up_org_and_user(:user)
		set_up_robot_instances
		visit '/robot_instances'

		expect(page).to have_content 'robot_instance1'
		expect(page).not_to have_content 'robot_instance2'
	end

	scenario 'Admin user looks at robot_instance_sessions page and sees robot_instance_sessions' do
		set_up_org_and_user(:admin)
		set_up_robot_instance_sessions
		visit '/robot_instance_sessions'

		expect(page).to have_content 'robot_instance_session1'
		expect(page).to have_content 'robot_instance_session2'
	end

	scenario 'Normal user looks at robot_instance_sessions page and sees only own org robot_instance_sessions' do
		set_up_org_and_user(:user)
		set_up_robot_instance_sessions
		visit '/robot_instance_sessions'

		expect(page).to have_content 'robot_instance_session1'
		expect(page).not_to have_content 'robot_instance_session2'
	end

	def set_up_agent_sessions
		set_up_agents
		set_up_robot_instance_sessions
		agent_session1 = FactoryGirl.create :agent_session, agent: @agent1, hostname: 'hostname1', robot_instance_session: @robot_instance_session1
		agent_session2 = FactoryGirl.create :agent_session, agent: @agent2, hostname: 'hostname2', robot_instance_session: @robot_instance_session2		
	end

	def set_up_agents
		@agent1 = FactoryGirl.create :agent, org: @org1, slug: 'agent1'
		@agent2 = FactoryGirl.create :agent, org: @org2, slug: 'agent2'
	end

	def set_up_robot_instance_sessions
		set_up_robot_instances
		@robot_instance_session1 = FactoryGirl.create :robot_instance_session, robot_instance: @robot_instance1, name: 'robot_instance_session1'
		@robot_instance_session2 = FactoryGirl.create :robot_instance_session, robot_instance: @robot_instance2, name: 'robot_instance_session2'
	end

	def set_up_robot_instances
		@robot_instance1 = FactoryGirl.create :robot_instance, org: @org1, name: 'robot_instance1'
		@robot_instance2 = FactoryGirl.create :robot_instance, org: @org2, name: 'robot_instance2'
	end

	def set_up_org_and_user(role)
		@org1 = FactoryGirl.create :org, slug: 'org1'
		@org2 = FactoryGirl.create :org, slug: 'org2'

		user = FactoryGirl.create(:user, org: @org1, name: 'user1', role: role)
    	signin(user.email, user.password)
	end

end