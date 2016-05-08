require 'rails_helper'

RSpec.describe "register Agent", type: :request do 
	include Warden::Test::Helpers
    include ApiHelpers

	it "won't allow unauthenticated user to create an agent" do
		org = FactoryGirl.create :org

		post "/api/v1/orgs/#{org.id}/agents", nil, json_headers

    	# test for the 401 status-code
    	expect(response).to have_http_status 401
	end

	it "won't allow badly authenticated user to create an agent" do
        org = FactoryGirl.create :org
        user = create_user

        # Sign In
        sign_in_info = sign_in(user)
        auth_token = 'wrong_token'

        headers = json_headers
        headers = add_authentication_to_headers(headers, user.email, auth_token)
        url = "/api/v1/orgs/#{org.id}/agents"
        post url, nil, headers

        expect(response).to have_http_status 401
    end

	it "will allow authenticated user from same org to create an agent" do
        org = FactoryGirl.create :org
        expect(org.agents.count).to eq 0        
        user = create_user org: org
        expect(org.users.count).to eq 1

        # Sign In
        sign_in_info = sign_in(user)
        auth_token = sign_in_info['auth_token']

        headers = json_headers
        headers = add_authentication_to_headers(headers, user.email, auth_token)
        url = "/api/v1/orgs/#{org.id}/agents"

        params = {agent: {slug: 'bar'}}
        post url, params.to_json, headers
        expect(response).to have_http_status 201
        new_agent_params = JSON.parse(response.body)

        expect(org.agents.count).to eq 1
        expect(org.agents.first.name).to eq 'Bar'
        expect(org.agents.first.slug).to eq 'bar'
        expect(org.users.count).to eq 2
        expect(org.agents.last.user).to eq org.users.last

        expect(new_agent_params['slug']).to eq 'bar'
        expect(new_agent_params['password']).to be_present
    end

	it "will not allow authenticated user from different org to create an agent" do
        org = FactoryGirl.create :org
        user = create_user

        # Sign In
        sign_in_info = sign_in(user)
        auth_token = sign_in_info['auth_token']

        headers = json_headers
        headers = add_authentication_to_headers(headers, user.email, auth_token)
        url = "/api/v1/orgs/#{org.id}/agents"

        params = {agent: {name: 'foo', slug: 'foo'}}

        post url, params.to_json, headers

        expect(response).to have_http_status 401
    end

end

