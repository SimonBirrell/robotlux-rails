require 'rails_helper'

RSpec.describe AgentSession, type: :model do

	before :all do
		@agent = FactoryGirl.create :agent
	end

	it "should require start time, agent, hostname, ros_master_uri" do

		agent_session = AgentSession.create
		expect(agent_session.id).to be_nil

		agent_session = AgentSession.create start_time: Time.zone.now
		expect(agent_session.id).to be_nil

		agent_session = AgentSession.create start_time: Time.zone.now, 
											agent: @agent
		expect(agent_session.id).to be_nil

		agent_session = AgentSession.create start_time: Time.zone.now, 
											agent: @agent, 
											hostname: 'foo'
		expect(agent_session.id).to be_nil

		agent_session = AgentSession.create start_time: Time.zone.now, 
											agent: @agent, 
											hostname: 'foo',
											ros_master_uri: 'bar'
		expect(agent_session.id).to be_present

	end

end
