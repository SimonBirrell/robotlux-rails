class AgentSession < ActiveRecord::Base

	belongs_to :agent
	belongs_to :robot_instance_session

	validates :start_time, presence: true
	validates :agent, presence: true
	validates :hostname, presence: true
	validates :ros_master_uri, presence: true
	validates :robot_instance_session, presence: true

	def stop
		update_attribute :end_time, Time.zone.now
		open_agent_sessions = robot_instance_session.open_agent_sessions
		robot_instance_session.stop if open_agent_sessions.length==0
	end

end
