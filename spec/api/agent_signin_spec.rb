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

