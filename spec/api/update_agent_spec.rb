require 'rails_helper'

RSpec.describe "Update Agent", type: :request do 
	include Warden::Test::Helpers
    include ApiHelpers

    before(:all) do
        @redis = Redis.new
    end

	it "won't allow unauthenticated user to update an agent" do
		org = FactoryGirl.create :org
        agent = FactoryGirl.create :agent, org: org

		put "/api/v1/orgs/#{org.id}/agents/#{agent.id}", nil, json_headers

    	# test for the 401 status-code
    	expect(response).to have_http_status 401
	end

	it "won't allow badly authenticated user to update an agent" do
        org = FactoryGirl.create :org
        agent = FactoryGirl.create :agent, org: org
        user = create_user

        # Sign In
        sign_in_info = sign_in(user)
        auth_token = 'wrong_token'

        headers = json_headers
        headers = add_authentication_to_headers(headers, user.email, auth_token)
        url = "/api/v1/orgs/#{org.id}/agents/#{agent.id}"
        put url, nil, headers

        expect(response).to have_http_status 401
    end

	it "will allow authenticated user from same org to update an agent" do
        org = FactoryGirl.create :org
        agent = FactoryGirl.create :agent, org: org, slug: 'foo'
        user = create_user org: org
        expect(org.users.count).to eq 2
        old_encrypted_password = user.encrypted_password

        # Sign In
        sign_in_info = sign_in(user)
        auth_token = sign_in_info['auth_token']

        headers = json_headers
        headers = add_authentication_to_headers(headers, user.email, auth_token)
        url = "/api/v1/orgs/#{org.id}/agents/#{agent.id}"

        params = {agent: {slug: 'bar'}}
        put url, params.to_json, headers
        expect(response).to have_http_status 201
        new_agent_params = JSON.parse(response.body)
        new_password = new_agent_params['password']
        expect(new_password).to be_present

        # Check right number of agents and users created
        expect(org.agents.count).to eq 1
        expect(org.agents.first.name).to eq 'Bar'
        expect(org.agents.first.slug).to eq 'bar'
        expect(org.users.count).to eq 2

        # Check correct values returned to agent
        expect(new_agent_params['slug']).to eq 'bar'
        expect(agent.user.encrypted_password).not_to eq old_encrypted_password

        # Check values passed to redis
        #redis_entry = @redis.get "agent_token:#{agent.token}"
    end

	it "will not allow authenticated user from different org to update an agent" do
        org = FactoryGirl.create :org
        agent = FactoryGirl.create :agent, org: org, slug: 'baz'
        user = create_user

        # Sign In
        sign_in_info = sign_in(user)
        auth_token = sign_in_info['auth_token']

        headers = json_headers
        headers = add_authentication_to_headers(headers, user.email, auth_token)
        url = "/api/v1/orgs/#{org.id}/agents/#{agent.id}"

        params = {agent: {name: 'foo', slug: 'foo'}}

        put url, params.to_json, headers

        expect(response).to have_http_status 401
    end

end

