require 'rails_helper'

RSpec.describe "Agent gets Org info", type: :request do 
	include Warden::Test::Helpers
    include ApiHelpers

	it "won't allow unauthenticated user to get org info" do
		org = FactoryGirl.create :org

		get "/api/v1/orgs/#{org.id}/agents_info", nil, json_headers

    	# test for the 401 status-code
    	expect(response).to have_http_status 401
	end
	
    it "won't allow badly authenticated user to get org info" do
        org = FactoryGirl.create :org
        user = create_user

        # Sign In
        sign_in_info = sign_in(user)
        auth_token = 'wrong_token'

        headers = json_headers
        headers = add_authentication_to_headers(headers, user.email, auth_token)
        url = "/api/v1/orgs/#{org.id}/agents_info"
        get url, nil, headers

        expect(response).to have_http_status 401
    end

    it "allows Devise authenticated user from correct org to get org info" do
        org = FactoryGirl.create :org
        agent1 = FactoryGirl.create :agent, org: org, slug: 'foo'
        agent2 = FactoryGirl.create :agent, org: org, slug: 'bar'
        user = create_user org: org

        # Sign In
        sign_in_info = sign_in(user)
        auth_token = sign_in_info['auth_token']
        org_id = sign_in_info['org_id']
        expect(auth_token).to be_present
        expect(org_id).to be_present
        expect(org.id).to eq user.org_id

        headers = json_headers
        headers = add_authentication_to_headers(headers, user.email, auth_token)
        url = "/api/v1/orgs/#{org.id}/agents_info"
        get url, nil, headers

        expect(response).to have_http_status 200
        json = JSON.parse(response.body)
        expect(json['id']).to eq org.id
        expect(json['name']).to eq org.name
        expect(json['slug']).to eq org.slug

        agents = json['agents']
        expect(agents).to be_present
        agents.each do |agent|
            expect(agent['id']).to be_present
            expect(agent['name']).to be_present
            expect(agent['slug']).to be_present
        end
    end

    it "won't allow Devise authenticated user to get org info from different org" do
        org = FactoryGirl.create :org
        org2 = FactoryGirl.create :org
        agent1 = FactoryGirl.create :agent, org: org, slug: 'foo'
        agent2 = FactoryGirl.create :agent, org: org, slug: 'bar'
        user = create_user

        # Sign In
        sign_in_info = sign_in(user)
        auth_token = sign_in_info['auth_token']
        org_id = sign_in_info['org_id']
        expect(auth_token).to be_present
        expect(org_id).to be_present

        headers = json_headers
        headers = add_authentication_to_headers(headers, user.email, auth_token)
        url = "/api/v1/orgs/#{org2.id}/agents_info"
        get url, nil, headers

        expect(response).to have_http_status 401
    end

end