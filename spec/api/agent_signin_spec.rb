require 'rails_helper'

RSpec.describe "Agent signs in", type: :request do 
	include Warden::Test::Helpers
    include ApiHelpers

    before(:all) do
    	# Create agent
    	@agent = FactoryGirl.create :agent
    	expect(@agent).to be_present
    	expect(@agent.network).to be_present

    	# Check user created
    	@user = @agent.user
    	expect(@user).to be_present
    	expect(User.count).to eq 1
    	expect(@user.role). to eq 'agent'

    	@redis = Redis.new
    end

    it "should be able to sign in with valid credentials" do
        expect(RobotInstance.count).to eq 0
    	old_auth_token = @user.authentication_token
    	expect(old_auth_token).to be_present

    	# Sign In
        sign_in_info = sign_in(@user, @agent.password)
        auth_token = sign_in_info['auth_token']

        # Check auth token has changed
        expect(auth_token).to be_present
        expect(auth_token).not_to eq old_auth_token

        # Check REDIS now contains new auth_token
        agent_details = LuxserverInterface.get_agent_details(auth_token)
        expect(agent_details['slug']).to eq @agent.slug
        expect(agent_details['username']).to eq @agent.username
        expect(agent_details['org_slug']).to eq @agent.org.slug
        expect(agent_details['network']).to eq @agent.network

        # Check robot instance created
        expect(RobotInstance.count).to eq 1
    end

    it "should create correct number of robot instances and sessions" do
        expect(AgentSession.count).to eq 0
        expect(RobotInstance.count).to eq 0
        expect(RobotInstanceSession.count). to eq 0
        agent_logon_params = {network: 'foo', 
                              master_key: 'bar',
                              launch_command: 'baz',
                              ros_master_uri: 'http://localhost:1234/',
                              hostname: 'ivy'
                            }
        sign_in_info = sign_in(@user, @agent.password, agent_logon_params)
        auth_token = sign_in_info['auth_token']

        # Check Robot Instance created correctly
        expect(RobotInstance.count).to eq 1
        robot_instance = RobotInstance.first
        expect(robot_instance.org_id).to eq @user.org.id
        expect(robot_instance.network).to eq 'foo'
        expect(robot_instance.master_key).to eq 'bar'
        expect(robot_instance.launch_command).to eq 'baz'
        expect(robot_instance.name).to be_present

        # Check Robot Instance Sessions created correctly
        expect(RobotInstanceSession.count). to eq 1
        expect(robot_instance.robot_instance_sessions.count).to eq 1
        robot_instance_session = RobotInstanceSession.last
        expect(robot_instance_session.start_session).to be_present
        expect(robot_instance_session.session_token).to be_present
        expect(robot_instance_session.agent_sessions.count).to eq 1

        # Check Agent Session also created
        expect(AgentSession.count).to eq 1
        expect(@agent.agent_sessions.count).to eq 1
        agent_session = AgentSession.last
        expect(agent_session.start_time).to be_present
        expect(agent_session.ros_master_uri).to eq 'http://localhost:1234/'
        expect(agent_session.hostname).to eq 'ivy'

        # Connect second agent
        agent2 = FactoryGirl.create :agent, org: @agent.org
        agent_logon_params2 = agent_logon_params.merge({hostname: 'nick'})
        sign_in_info2 = sign_in(agent2.user, agent2.password, agent_logon_params2)
        auth_token2 = sign_in_info['auth_token']
        expect(AgentSession.count).to eq 2
        expect(RobotInstance.count).to eq 1        
        expect(RobotInstanceSession.count).to eq 1       

        # Sign Out First agent
        sign_out(@user, @user.email, auth_token)
        expect(agent_session.reload.end_time).to be_present

        # Sign Out Second agent
        sign_out(agent2.user, agent2.user.email, auth_token2)
        expect(RobotInstance.count).to eq 1
        expect(RobotInstanceSession.count).to eq 1
        expect(robot_instance_session.reload.end_session).to be_present

        # Sign in first agent again
        sign_in_info = sign_in(@user, @agent.password, agent_logon_params)
        auth_token = sign_in_info['auth_token']
        expect(robot_instance_session.reload.end_session).to be_present
        expect(RobotInstanceSession.count).to eq 2

    end

    it "should be able to sign out" do
    	# Sign In
        sign_in_info = sign_in(@user, @agent.password)
        auth_token = sign_in_info['auth_token']

        # Test
        headers = json_headers
        headers = add_authentication_to_headers(headers, @user.email, auth_token)
        org = @user.org
        url = "/api/v1/orgs/#{org.id}/agents_info"
        get url, nil, headers
        expect(response).to have_http_status 200
        json = JSON.parse(response.body)
        expect(json['id']).to eq org.id
        expect(json['name']).to eq org.name
        expect(json['slug']).to eq org.slug

        # Sign out
        sign_out(@user, @agent.username, auth_token)

        # Check REDIS token deleted
        agent_details = LuxserverInterface.get_agent_details(auth_token)
		expect(agent_details).to be_nil        
    end

end

